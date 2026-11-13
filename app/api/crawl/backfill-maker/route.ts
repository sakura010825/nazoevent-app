import { NextRequest, NextResponse } from 'next/server'
import { fetchMakerFromNazohiroba } from '@/lib/crawler/nazohiroba'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

// 1回で処理する件数（Hobbyプランの60秒に収まるように）
const BATCH_SIZE = 15

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (authHeader === `Bearer ${cronSecret}`) return true
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret === cronSecret) return true
  return false
}

/**
 * 制作元（maker）が未設定の「終了していないイベント」に、ナゾヒロバの「制作元」欄を補完する。
 *
 * GET /api/crawl/backfill-maker?secret=CRON_SECRET
 *   → 結果の next_after が null でなければ、&after=<next_after> を付けて続きを実行する
 *     （ナゾヒロバに制作元が載っていないイベントは空のまま残るため、id のカーソルで先へ進める）
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const after = new URL(request.url).searchParams.get('after')
  const today = new Date().toISOString().split('T')[0]
  const results = { updated: 0, notFound: 0, failed: 0 }

  let query = supabase
    .from('events')
    .select('id, title, url')
    .eq('is_deleted', false)
    .or('maker.is.null,maker.eq.')
    .or(`end_date.gte.${today},end_date.is.null`)
    .like('url', '%nazohiroba.com%')
    .order('id')
    .limit(BATCH_SIZE)
  if (after) query = query.gt('id', after)

  const { data: events, error } = await query
  if (error) {
    return NextResponse.json({ error: String(error.message ?? error) }, { status: 500 })
  }

  const list = (events || []) as { id: string; title: string; url: string }[]
  for (const event of list) {
    try {
      const maker = await fetchMakerFromNazohiroba(event.url)
      if (!maker) {
        results.notFound++
        console.log(`[backfill-maker] 制作元なし: ${event.title}`)
        continue
      }

      const { error: updateError } = await supabase.from('events').update({ maker }).eq('id', event.id)
      if (updateError) throw new Error(String(updateError.message ?? updateError))

      results.updated++
      console.log(`[backfill-maker] 更新: ${event.title} → ${maker}`)
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (err) {
      results.failed++
      console.error(`[backfill-maker] エラー: ${event.title}`, err)
    }
  }

  const nextAfter = list.length === BATCH_SIZE ? list[list.length - 1].id : null
  return NextResponse.json({ success: true, results, next_after: nextAfter })
}
