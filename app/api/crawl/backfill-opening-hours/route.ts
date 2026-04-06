import { NextRequest, NextResponse } from 'next/server'
import { extractEventFromUrl } from '@/lib/ai/extract-event'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (authHeader === `Bearer ${cronSecret}`) return true
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret === cronSecret) return true
  return false
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const results = { updated: 0, skipped: 0, failed: 0 }

  // opening_hours が未設定で official_url または url を持つイベントを取得（5件ずつ処理）
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, url, official_url')
    .is('opening_hours', null)
    .eq('is_deleted', false)
    .limit(5)

  if (error) {
    return NextResponse.json({ error: String(error.message ?? error) }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, message: '補完対象なし', results })
  }

  for (const event of events as { id: string; title: string; url: string; official_url: string | null }[]) {
    try {
      // 公式URLがあればそちらを優先（営業時間は公式サイトに載っていることが多い）
      const targetUrl = event.official_url || event.url
      console.log(`[backfill-opening-hours] 処理中: ${event.title} (${targetUrl})`)

      const extracted = await extractEventFromUrl(targetUrl)

      if (!extracted.opening_hours) {
        // 公式URLで取れなかった場合、nazohiroba URLも試す
        if (event.official_url && event.url !== event.official_url) {
          const fallback = await extractEventFromUrl(event.url)
          if (fallback.opening_hours) {
            const { error: updateError } = await supabase
              .from('events')
              .update({ opening_hours: fallback.opening_hours })
              .eq('id', event.id)

            if (updateError) throw new Error(String(updateError.message ?? updateError))
            results.updated++
            console.log(`[backfill-opening-hours] 更新完了(nazohiroba): ${event.title} → ${fallback.opening_hours}`)
            continue
          }
        }
        results.skipped++
        console.log(`[backfill-opening-hours] 営業時間見つからず: ${event.title}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({ opening_hours: extracted.opening_hours })
        .eq('id', event.id)

      if (updateError) throw new Error(String(updateError.message ?? updateError))

      results.updated++
      console.log(`[backfill-opening-hours] 更新完了: ${event.title} → ${extracted.opening_hours}`)

      // AI APIへの連続リクエストを緩和
      await new Promise((resolve) => setTimeout(resolve, 1500))
    } catch (err) {
      results.failed++
      console.error(`[backfill-opening-hours] エラー: ${event.title}`, err)
    }
  }

  return NextResponse.json({ success: true, results })
}
