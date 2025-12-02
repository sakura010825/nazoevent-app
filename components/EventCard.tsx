'use client'

import { EventCard } from '@/types/event'
import { Heart, MapPin, Calendar, Flag } from 'lucide-react'
import { getStatusBadge, formatDateRange } from '@/lib/utils/event'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LogEventModal from './LogEventModal'

interface EventCardProps {
  event: EventCard
}

export default function EventCardComponent({ event }: EventCardProps) {
  const [isFavorite, setIsFavorite] = useState(event.isFavorite || false)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const supabase = createClient()

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
        // お気に入りを削除
        await supabase
          .from('user_event_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', event.id)
          .eq('status', 'FAVORITE')
        setIsFavorite(false)
      } else {
        // お気に入りを追加
        await supabase
          .from('user_event_logs')
          .upsert({
            user_id: user.id,
            event_id: event.id,
            status: 'FAVORITE',
          })
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
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
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
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange to-mint-green">
            <span className="text-white text-2xl font-bold">?</span>
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-3 right-3">
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
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 line-clamp-2">
          {event.title}
        </h3>

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

        {/* 行ったボタン */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowLogModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-mint-green text-gray-800 rounded-2xl font-semibold hover:bg-opacity-80 transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span>行った🚩</span>
          </button>
        </div>
      </div>
      </div>

      {showLogModal && (
        <LogEventModal
          event={event}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </>
  )
}

