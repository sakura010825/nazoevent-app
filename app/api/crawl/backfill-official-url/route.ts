import { NextRequest, NextResponse } from 'next/server'
import { fetchOfficialUrl } from '@/lib/crawler/nazohiroba'
import { AD_DOMAINS } from '@/lib/utils/official-url'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

// 1回の実行で処理する上限
const MAX_PROCESS_PER_RUN = 20

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (authHeader === `Bearer ${cronSecret}`) return true
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret === cronSecret) return true
  return false
}

type TargetEvent = { id: string; url: string; official_url: string | null }

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const results = { updated: 0, repaired: 0, cleared: 0, skipped: 0, failed: 0 }

  // 1. 広告URL（PRバナー）が official_url に入ってしまっているイベントを優先して洗い替える
  //    旧ロジックが詳細ページ先頭の広告リンクを拾っていたため、既存データに混入している
  const adFilter = AD_DOMAINS.map((domain) => `official_url.ilike.%${domain}%`).join(',')
  const { data: adEvents, error: adError } = await supabase
    .from('events')
    .select('id, url, official_url')
    .like('url', '%nazohiroba.com%')
    .or(adFilter)
    .limit(MAX_PROCESS_PER_RUN)

  if (adError) {
    return NextResponse.json({ error: String(adError.message ?? adError) }, { status: 500 })
  }

  // 2. official_url が未設定のイベントを残り枠で補完する
  const remaining = MAX_PROCESS_PER_RUN - (adEvents?.length ?? 0)
  let missingEvents: TargetEvent[] = []
  if (remaining > 0) {
    const { data, error } = await supabase
      .from('events')
      .select('id, url, official_url')
      .like('url', '%nazohiroba.com%')
      .is('official_url', null)
      .limit(remaining)

    if (error) {
      return NextResponse.json({ error: String(error.message ?? error) }, { status: 500 })
    }
    missingEvents = (data ?? []) as TargetEvent[]
  }

  const targets = [...((adEvents ?? []) as TargetEvent[]), ...missingEvents]

  if (targets.length === 0) {
    return NextResponse.json({ success: true, message: '補完対象なし', results })
  }

  for (const event of targets) {
    try {
      // official_url が既に入っている＝広告URLの洗い替え対象
      const isRepair = !!event.official_url
      const officialUrl = await fetchOfficialUrl(event.url)

      // 未設定のイベントで公式URLが見つからない場合は何もしない
      if (!officialUrl && !isRepair) {
        results.skipped++
        console.log(`[backfill] 公式URL見つからず: ${event.url}`)
        continue
      }

      const updatePayload: Record<string, unknown> = { official_url: officialUrl }

      // 洗い替え時は広告ページから抽出された opening_hours も無効なので
      // null に戻して次回のバックフィルで正しいURLから再抽出させる
      if (isRepair) {
        updatePayload.opening_hours = null
      }

      const { error: updateError } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', event.id)

      if (updateError) throw new Error(String(updateError.message ?? updateError))

      if (!isRepair) {
        results.updated++
        console.log(`[backfill] 更新完了: ${officialUrl}`)
      } else if (officialUrl) {
        results.repaired++
        console.log(`[backfill] 広告URLを修正: ${event.official_url} → ${officialUrl}`)
      } else {
        results.cleared++
        console.log(`[backfill] 広告URLを削除（公式サイト無し）: ${event.url}`)
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (err) {
      results.failed++
      console.error(`[backfill] エラー: ${event.url}`, err)
    }
  }

  return NextResponse.json({ success: true, results })
}
