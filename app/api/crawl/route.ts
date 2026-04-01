import { NextRequest, NextResponse } from 'next/server'
import { collectAllEventUrls, fetchOfficialUrl } from '@/lib/crawler/nazohiroba'
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
    // 1. ナゾヒロバから全対象URLを収集
    const collectedUrls = await collectAllEventUrls()
    results.collected = collectedUrls.length

    // 2. すでにDBに登録済みのURLを取得
    const { data: existingEvents, error: fetchError } = await supabase
      .from('events')
      .select('url')

    if (fetchError) {
      throw new Error(`既存イベント取得エラー: ${fetchError.message}`)
    }

    const existingUrls = new Set((existingEvents || []).map((e) => e.url))

    // 3. 新着URLのみ抽出（1回の実行上限を適用）
    const allNewUrls = collectedUrls.filter((url) => !existingUrls.has(url))
    const newUrls = allNewUrls.slice(0, MAX_PROCESS_PER_RUN)
    results.skipped = collectedUrls.length - allNewUrls.length

    console.log(`[crawl] 新着: ${allNewUrls.length}件 / 今回処理: ${newUrls.length}件 / スキップ(登録済み): ${results.skipped}件`)

    // 4. 新着URLを1件ずつ処理（AI抽出 → DB登録）
    for (const url of newUrls) {
      try {
        console.log(`[crawl] 処理中: ${url}`)

        // AI でイベント情報を抽出
        const extracted = await extractEventFromUrl(url)

        // ナゾヒロバの詳細ページから公式URLを取得
        const officialUrl = await fetchOfficialUrl(url)
        if (officialUrl) {
          console.log(`[crawl] 公式URL取得: ${officialUrl}`)
        }

        // DBに登録
        const { error: insertError } = await supabase.from('events').insert({
          url,
          official_url: officialUrl,
          title: extracted.title,
          start_date: extracted.start_date,
          end_date: extracted.end_date || null,
          location: extracted.location || null,
          area: extracted.area || null,
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
          console.log(`[crawl] 登録完了: ${extracted.title}`)
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
