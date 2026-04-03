'use client'

import { EventCard } from '@/types/event'
import { Heart, MapPin, Calendar, Flag, Edit, Trash2, PawPrint, Clock } from 'lucide-react'
import { getStatusBadge, formatDateRange } from '@/lib/utils/event'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import LogEventModal from './LogEventModal'
import EditEventModal from './EditEventModal'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EventCardProps {
  event: EventCard
}

export default function EventCardComponent({ event }: EventCardProps) {
  const [isFavorite, setIsFavorite] = useState(event.isFavorite || false)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  // ユーザー情報を取得
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [supabase])

  const statusBadge = getStatusBadge(
    event.current_status as '開催中' | '開催予定' | '終了',
    event.days_until_end
  )

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('ログインが必要です')
      setIsLoading(false)
      return
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_event_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', event.id)
          .eq('status', 'FAVORITE')
        if (error) throw error
        setIsFavorite(false)
      } else {
        const { error } = await supabase
          .from('user_event_logs')
          .upsert({
            user_id: user.id,
            event_id: event.id,
            status: 'FAVORITE',
          })
        if (error) throw error
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Link href={`/events/${event.id}`} className="block">
        <div className="bg-white rounded-3xl shadow-soft-md overflow-hidden hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer">
          {/* 画像 */}
          <div className="relative h-48 bg-gray-200 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent && !parent.querySelector('.fallback-image')) {
                const fallback = document.createElement('div')
                fallback.className = 'fallback-image w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange via-pink-200 to-mint-green'
                fallback.innerHTML = '<div class="text-center"><div class="text-white text-4xl mb-1">🔍</div><div class="text-white text-sm font-bold">謎解き</div></div>'
                parent.appendChild(fallback)
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange via-pink-200 to-mint-green">
            <div className="text-center">
              <div className="text-white text-4xl mb-1">🔍</div>
              <div className="text-white text-sm font-bold">謎解き</div>
            </div>
          </div>
        )}

        {/* 購入済みマーク（肉球） */}
        {(event as any).is_purchased && (
          <div className="absolute top-2 right-2 z-10 transform rotate-12 hover:rotate-6 hover:scale-110 transition-all duration-300 hover:animate-bounce">
            <div className="bg-gradient-to-br from-orange-400 via-pink-400 to-orange-500 p-2.5 rounded-full shadow-lg">
              <PawPrint className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-3 left-3">
          <div
            className={`px-3 py-1 rounded-2xl text-xs font-semibold bg-${statusBadge.color} bg-opacity-90 text-white shadow-md`}
          >
            {statusBadge.emoji} {statusBadge.text}
          </div>
        </div>

        {/* お気に入りボタン */}
        <button
          onClick={handleFavoriteClick}
          disabled={isLoading}
          className={`absolute bottom-3 right-3 p-2 rounded-full bg-white shadow-md hover:scale-110 active:scale-95 transition-all duration-200 ${
            isFavorite ? 'text-soft-coral animate-pulse-once' : 'text-gray-400'
          }`}
          aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
        >
          <Heart 
            className={`w-5 h-5 transition-all duration-200 ${
              isFavorite ? 'fill-current scale-110' : ''
            }`} 
          />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 line-clamp-2 flex-1">
            {event.title}
          </h3>
        </div>

        {/* 情報 */}
        <div className="space-y-2 text-sm text-gray-600">
          {event.location && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formatDateRange(event.start_date, event.end_date)}</span>
          </div>

          {event.price && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-pastel-orange">{event.price}</span>
            </div>
          )}

          {(event as any).duration_text && (
            <div className="flex items-center gap-2">
              <div className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{(event as any).duration_text}</span>
              </div>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        {(event.favorite_count > 0 || event.went_count > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            {event.favorite_count > 0 && (
              <span>❤️ {event.favorite_count}人が気になる</span>
            )}
            {event.went_count > 0 && (
              <span>🚩 {event.went_count}人が行った</span>
            )}
          </div>
        )}

        {/* 行ったボタンと編集・削除ボタン */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowLogModal(true)
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-mint-green text-gray-800 rounded-2xl font-semibold hover:bg-opacity-80 transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span>行った🚩</span>
          </button>

          {/* ログインユーザーは編集・削除ボタンを表示 */}
          {currentUser && (
            <div className="flex gap-2">
              <button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    setShowEditModal(true)
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                <span>編集</span>
              </button>
              <button
                disabled={isDeleting}
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (isDeleting) return

                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) {
                    alert('ログインが必要です')
                    return
                  }

                  if (window.confirm('このイベントを削除してもよろしいですか？')) {
                    setIsDeleting(true)
                    const { error } = await supabase
                      .from('events')
                      .delete()
                      .eq('id', event.id)

                    if (error) {
                      console.error('Error deleting event:', error)
                      alert('イベントの削除に失敗しました')
                      setIsDeleting(false)
                    } else {
                      router.refresh()
                    }
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors text-sm ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                <span>削除</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
      </Link>

      {showLogModal && (
        <LogEventModal
          event={event}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {showEditModal && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}

