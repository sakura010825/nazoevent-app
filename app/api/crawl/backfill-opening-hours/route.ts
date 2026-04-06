import { NextRequest, NextResponse } from 'next/server'
import { extractOpeningHoursFromUrl } from '@/lib/ai/extract-event'
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

  // official_urlがあり、opening_hoursが未設定のイベントを取得（2件ずつ）
  // nazohirobaには時間情報がないため、official_urlのあるものだけ対象
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, url, official_url')
    .is('opening_hours', null)
    .not('official_url', 'is', null)
    .eq('is_deleted', false)
    .limit(2)

  if (error) {
    return NextResponse.json({ error: String(error.message ?? error) }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, message: '補完対象なし', results })
  }

  for (const event of events as { id: string; title: string; url: string; official_url: string }[]) {
    try {
      console.log(`[backfill-opening-hours] 処理中: ${event.title} (${event.official_url})`)

      // 専用関数で時間情報のみ抽出（精度向上）
      const openingHours = await extractOpeningHoursFromUrl(event.official_url)

      // 見つからなかった場合は 'none' を記録して再処理を防ぐ
      const valueToSave = openingHours || 'none'

      const { error: updateError } = await supabase
        .from('events')
        .update({ opening_hours: valueToSave })
        .eq('id', event.id)

      if (updateError) throw new Error(String(updateError.message ?? updateError))

      if (openingHours) {
        results.updated++
        console.log(`[backfill-opening-hours] 更新完了: ${event.title} → ${openingHours}`)
      } else {
        results.skipped++
        console.log(`[backfill-opening-hours] 情報なし（noneを記録）: ${event.title}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err) {
      results.failed++
      console.error(`[backfill-opening-hours] エラー: ${event.title}`, err)
    }
  }

  return NextResponse.json({ success: true, results })
}
