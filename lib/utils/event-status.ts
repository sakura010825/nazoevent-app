/**
 * イベントのステータス（2人で共有）
 *   none     … 何もしていない
 *   favorite … お気に入り（気になる）
 *   planned  … 行く予定（お気に入りの中から「行く」と決めたもの）
 *
 * お気に入りと行く予定は重ならない。流れは なし → お気に入り → 行く予定、
 * 行く予定が合わなかったら お気に入りに戻す。
 *
 * DB 上の持ち方:
 *   planned  = events.is_purchased が true（旧「チケット購入済み」の列を流用）
 *   favorite = user_event_logs に FAVORITE が1件以上ある（夫婦どちらが付けたものでも）
 */
export type PlanStatus = 'none' | 'favorite' | 'planned'

export function getPlanStatus(event: { is_purchased: boolean; favorite_count: number }): PlanStatus {
  if (event.is_purchased) return 'planned'
  if (event.favorite_count > 0) return 'favorite'
  return 'none'
}

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  none: 'なし',
  favorite: 'お気に入り',
  planned: '行く予定',
}

/** ステータスを変更する（POST /api/events/[id]/status）。失敗したら Error を投げる */
export async function requestPlanStatus(eventId: string, status: PlanStatus): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `ステータスの更新に失敗しました（${response.status}）`)
  }
}
