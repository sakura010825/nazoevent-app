import { NextRequest, NextResponse } from 'next/server'
import { fetchOfficialUrl } from '@/lib/crawler/nazohiroba'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

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

  const supabase = createAdminClient()
  const results = { updated: 0, skipped: 0, failed: 0 }

  // official_url が未設定でナゾヒロバURLのイベントを取得（20件ずつ処理）
  const { data: events, error } = await supabase
    .from('events')
    .select('id, url')
    .like('url', '%nazohiroba.com%')
    .is('official_url', null)
    .limit(20) as { data: { id: string; url: string }[] | null; error: unknown }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, message: '補完対象なし', results })
  }

  for (const event of events) {
    try {
      const officialUrl = await fetchOfficialUrl(event.url)

      if (!officialUrl) {
        results.skipped++
        console.log(`[backfill] 公式URL見つからず: ${event.url}`)
        continue
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({ official_url: officialUrl })
        .eq('id', event.id)

      if (updateError) throw new Error(updateError.message)

      results.updated++
      console.log(`[backfill] 更新完了: ${officialUrl}`)

      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err) {
      results.failed++
      console.error(`[backfill] エラー: ${event.url}`, err)
    }
  }

  return NextResponse.json({ success: true, results })
}
