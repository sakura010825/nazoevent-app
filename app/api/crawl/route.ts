import { NextRequest, NextResponse } from 'next/server'
import { collectAllEventUrls, fetchOfficialUrl, fetchLocationFromNazohiroba, TARGET_PREFECTURE_NAMES } from '@/lib/crawler/nazohiroba'
import { extractEventFromUrl } from '@/lib/ai/extract-event'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Pro プランで最大300秒まで延長（デフォルト10秒→300秒）
export const maxDuration = 300

// 1回の実行で処理するURLの上限（多すぎるとタイムアウトするため）
// 毎日実行すれば新着は数件程度なので通常は上限に達しない
const MAX_PROCESS_PER_RUN = 20

// Vercel Cron / 手動トリガー共通のシークレット認証
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) return false

  // Vercel Cronは "Bearer {secret}" 形式
  if (authHeader === `Bearer ${cronSecret}`) return true

  // 手動実行用: クエリパラメータでも受け付ける
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret === cronSecret) return true

  return false
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const systemUserId = process.env.SYSTEM_USER_ID
  if (!systemUserId) {
    return NextResponse.json({ error: 'SYSTEM_USER_ID が設定されていません' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const results = {
    collected: 0,
    skipped: 0,
    registered: 0,
    failed: 0,
    errors: [] as string[],
  }

  try {
    // 1. ナゾヒロバから全対象URLを収集（都道府県情報付き）
    const collectedItems = await collectAllEventUrls()
    results.collected = collectedItems.length

    // 2. すでにDBに登録済みのURLを取得
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('url')

    if (fetchError) {
      throw new Error(`既存イベント取得エラー: ${fetchError.message}`)
    }

    const existingUrls = new Set((existingEvents || []).map((e: { url: string }) => e.url))

    // 3. 新着URLのみ抽出（1回の実行上限を適用）
    const allNewItems = collectedItems.filter((item) => !existingUrls.has(item.url))
    const newItems = allNewItems.slice(0, MAX_PROCESS_PER_RUN)
    results.skipped = collectedItems.length - allNewItems.length

    console.log(`[crawl] 新着: ${allNewItems.length}件 / 今回処理: ${newItems.length}件 / スキップ(登録済み): ${results.skipped}件`)

    // 4. 新着URLを1件ずつ処理（AI抽出 → DB登録）
    for (const { url, crawledPrefecture } of newItems) {
      try {
        console.log(`[crawl] 処理中: ${url} (クロール元: ${crawledPrefecture})`)

        // AI でイベント情報を抽出
        const extracted = await extractEventFromUrl(url)

        // AIが抽出したareaがターゲット外の場合、クロール元の都道府県を使用
        let area = extracted.area || null
        if (area && !TARGET_PREFECTURE_NAMES.some((name) => area!.includes(name))) {
          console.log(`[crawl] エリア補正: "${area}" → "${crawledPrefecture}" (ターゲット外のため)`)
          area = crawledPrefecture
        }
        if (!area) {
          area = crawledPrefecture
        }

        // ナゾヒロバの詳細ページから公式URLを取得
        const officialUrl = await fetchOfficialUrl(url)
        if (officialUrl) {
          console.log(`[crawl] 公式URL取得: ${officialUrl}`)
        }

        // locationがnullの場合、nazohirobaページから場所をスクレイピング
        let location = extracted.location || null
        if (!location) {
          try {
            location = await fetchLocationFromNazohiroba(url)
            if (location) {
              console.log(`[crawl] nazohirobaから場所取得: ${location}`)
            }
          } catch (err) {
            console.warn(`[crawl] 場所取得失敗: ${err}`)
          }
        }

        // DBに登録
        const { error: insertError } = await supabase.from('events').insert({
          url,
          official_url: officialUrl,
          title: extracted.title,
          start_date: extracted.start_date,
          end_date: extracted.end_date || null,
          location,
          area,
          type: extracted.type || null,
          maker: extracted.maker || null,
          price: extracted.price || null,
          description: extracted.description || null,
          duration_text: extracted.duration_text || null,
          image_url: extracted.image_url || null,
          is_purchased: false,
          created_by: systemUserId,
        })

        if (insertError) {
          // URL重複（UNIQUE制約）はスキップ扱い
          if (insertError.code === '23505') {
            results.skipped++
            console.log(`[crawl] 重複スキップ: ${url}`)
          } else {
            throw new Error(insertError.message)
          }
        } else {
          results.registered++
          console.log(`[crawl] 登録完了: ${extracted.title} (エリア: ${area})`)
        }

        // AI APIへの連続リクエストを緩和
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (err) {
        results.failed++
        const msg = `${url}: ${err instanceof Error ? err.message : String(err)}`
        results.errors.push(msg)
        console.error(`[crawl] エラー: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[crawl] 致命的エラー: ${msg}`)
    return NextResponse.json({ error: msg, results }, { status: 500 })
  }

  console.log(`[crawl] 完了:`, results)
  return NextResponse.json({ success: true, results })
}
