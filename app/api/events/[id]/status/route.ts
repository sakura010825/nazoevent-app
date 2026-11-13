import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanStatus } from '@/lib/utils/event-status'

const STATUSES: PlanStatus[] = ['none', 'favorite', 'planned']

/**
 * イベントのステータス（なし / お気に入り / 行く予定）を変更する。
 *
 * お気に入りは夫婦2人で共有するため、外すときは相手が付けた FAVORITE も消す必要がある。
 * user_event_logs の RLS は「自分のログだけ操作可」なので、ログイン確認だけ本人のセッションで行い、
 * 書き込みはサービスロール（RLS をバイパス）で行う。
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const status = body?.status as PlanStatus | undefined
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'status は none / favorite / planned のいずれか' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const eventId = params.id

  const { data: event, error: findError } = await admin
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
  if (!event) return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 })

  const setPlanned = async (value: boolean) => {
    const { error } = await admin.from('events').update({ is_purchased: value }).eq('id', eventId)
    if (error) throw new Error(error.message)
  }
  const clearFavorites = async () => {
    const { error } = await admin.from('user_event_logs').delete().eq('event_id', eventId).eq('status', 'FAVORITE')
    if (error) throw new Error(error.message)
  }

  try {
    if (status === 'planned') {
      // お気に入り → 行く予定（重ならないようにお気に入りからは外す）
      await setPlanned(true)
      await clearFavorites()
    } else if (status === 'favorite') {
      // なし → お気に入り、または 行く予定 → お気に入りに戻す
      await setPlanned(false)
      const { error } = await admin
        .from('user_event_logs')
        .upsert(
          { user_id: user.id, event_id: eventId, status: 'FAVORITE' },
          { onConflict: 'user_id,event_id,status', ignoreDuplicates: true }
        )
      if (error) throw new Error(error.message)
    } else {
      // お気に入りから外す／「行った」を記録した後
      await setPlanned(false)
      await clearFavorites()
    }
  } catch (err) {
    console.error('[events/status] 更新エラー:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }

  return NextResponse.json({ success: true, status })
}
