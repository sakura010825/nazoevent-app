'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart, Flag, PawPrint } from 'lucide-react'
import { usePlannedToggle } from '@/lib/hooks/use-planned-toggle'
import LogEventModal from './LogEventModal'
import { EventCard } from '@/types/event'

interface EventActionsProps {
  event: EventCard
  initialIsFavorite: boolean
}

export default function EventActions({ event, initialIsFavorite }: EventActionsProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const supabase = createClient()
  const planned = usePlannedToggle(event.id, event.is_purchased)

  const handleFavoriteClick = async () => {
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          onClick={handleFavoriteClick}
          disabled={isLoading}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-200 ${
            isFavorite
              ? 'bg-soft-coral text-white hover:bg-opacity-90'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Heart className={`w-5 h-5 flex-shrink-0 ${isFavorite ? 'fill-current' : ''}`} />
          <span>お気に入り</span>
        </button>

        <button
          onClick={planned.toggle}
          disabled={planned.isSaving}
          aria-pressed={planned.isPlanned}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 rounded-2xl text-sm sm:text-base font-semibold transition-colors ${
            planned.isPlanned
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white hover:opacity-90'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <PawPrint className="w-5 h-5 flex-shrink-0" />
          <span>{planned.isPlanned ? '行く予定✓' : '行く予定'}</span>
        </button>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 bg-mint-green text-gray-800 rounded-2xl text-sm sm:text-base font-semibold hover:bg-opacity-80 transition-colors"
        >
          <Flag className="w-5 h-5 flex-shrink-0" />
          <span>行った🚩</span>
        </button>
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

