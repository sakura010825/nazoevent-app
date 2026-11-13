'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Flag, PawPrint } from 'lucide-react'
import LogEventModal from './LogEventModal'
import { EventCard } from '@/types/event'
import { getPlanStatus, PlanStatus, requestPlanStatus } from '@/lib/utils/event-status'

interface EventActionsProps {
  event: EventCard
}

const BUTTON_BASE =
  'flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 rounded-2xl text-sm sm:text-base font-semibold transition-colors disabled:opacity-60'

/**
 * 詳細ページのボタン。ステータスの流れ（なし → お気に入り → 行く予定）に合わせて出し分ける。
 *   なし       : ♡ お気に入りに入れる
 *   お気に入り : ♥ お気に入りから外す ／ 🐾 行く予定にする
 *   行く予定   : ♥ お気に入りに戻す
 */
export default function EventActions({ event }: EventActionsProps) {
  const router = useRouter()
  const serverStatus = getPlanStatus(event)
  const [status, setStatus] = useState<PlanStatus>(serverStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)

  // router.refresh() で最新値が届いたら追従する
  useEffect(() => {
    setStatus(serverStatus)
  }, [serverStatus])

  const change = async (next: PlanStatus) => {
    if (isSaving) return
    const prev = status
    setStatus(next)
    setIsSaving(true)
    try {
      await requestPlanStatus(event.id, next)
      router.refresh()
    } catch (err) {
      setStatus(prev)
      alert(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {status === 'none' && (
          <button
            onClick={() => change('favorite')}
            disabled={isSaving}
            className={`${BUTTON_BASE} bg-gray-100 text-gray-700 hover:bg-gray-200`}
          >
            <Heart className="w-5 h-5 flex-shrink-0" />
            <span>お気に入りに入れる</span>
          </button>
        )}

        {status === 'favorite' && (
          <>
            <button
              onClick={() => change('none')}
              disabled={isSaving}
              className={`${BUTTON_BASE} bg-soft-coral text-white hover:bg-opacity-90`}
            >
              <Heart className="w-5 h-5 flex-shrink-0 fill-current" />
              <span>お気に入りから外す</span>
            </button>
            <button
              onClick={() => change('planned')}
              disabled={isSaving}
              className={`${BUTTON_BASE} text-white bg-gradient-to-r from-orange-400 to-pink-400 hover:opacity-90`}
            >
              <PawPrint className="w-5 h-5 flex-shrink-0" />
              <span>行く予定にする</span>
            </button>
          </>
        )}

        {status === 'planned' && (
          <>
            <div className={`${BUTTON_BASE} text-white bg-gradient-to-r from-orange-400 to-pink-400 cursor-default`}>
              <PawPrint className="w-5 h-5 flex-shrink-0" />
              <span>行く予定</span>
            </div>
            <button
              onClick={() => change('favorite')}
              disabled={isSaving}
              className={`${BUTTON_BASE} text-pink-600 bg-pink-50 hover:bg-pink-100`}
            >
              <Heart className="w-5 h-5 flex-shrink-0" />
              <span>お気に入りに戻す</span>
            </button>
          </>
        )}

        <button
          onClick={() => setShowLogModal(true)}
          className={`${BUTTON_BASE} bg-mint-green text-gray-800 hover:bg-opacity-80`}
        >
          <Flag className="w-5 h-5 flex-shrink-0" />
          <span>行った🚩</span>
        </button>
      </div>

      {showLogModal && <LogEventModal event={event} onClose={() => setShowLogModal(false)} />}
    </>
  )
}
