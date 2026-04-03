import { NextRequest, NextResponse } from 'next/server'
import { fetchLocationFromNazohiroba } from '@/lib/crawler/nazohiroba'
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

  // location が未設定で nazohiroba URL を持つイベントを取得（10件ずつ処理）
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, url')
    .is('location', null)
    .like('url', '%nazohiroba.com%')
    .limit(10)

  if (error) {
    return NextResponse.json({ error: String(error.message ?? error) }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, message: '補完対象なし', results })
  }

  for (const event of events as { id: string; title: string; url: string }[]) {
    try {
      const location = await fetchLocationFromNazohiroba(event.url)

      if (!location) {
        results.skipped++
        console.log(`[backfill-location] 場所見つからず: ${event.title}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({ location })
        .eq('id', event.id)

      if (updateError) throw new Error(String(updateError.message ?? updateError))

      results.updated++
      console.log(`[backfill-location] 更新完了: ${event.title} → ${location}`)

      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      results.failed++
      console.error(`[backfill-location] エラー: ${event.title}`, err)
    }
  }

  return NextResponse.json({ success: true, results })
}
