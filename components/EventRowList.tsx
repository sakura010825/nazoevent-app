'use client'

import Link from 'next/link'
import { Building2, Calendar, Clock, MapPin, Heart, PawPrint } from 'lucide-react'
import { EventCard } from '@/types/event'
import { formatShortDateRange, getScheduleLabel, hasOpeningHours, ScheduleTone } from '@/lib/utils/event'
import type { PlanStatus } from '@/lib/utils/event-status'

interface EventRowListProps {
  events: EventCard[]
  /** favorite: お気に入りタブ（行く予定にする）／ planned: 行く予定タブ（お気に入りに戻す） */
  variant: 'favorite' | 'planned'
  onChangeStatus: (event: EventCard, next: PlanStatus) => void
}

const TONE_CLASS: Record<ScheduleTone, string> = {
  upcoming: 'bg-blue-50 text-blue-700',
  ongoing: 'bg-green-50 text-green-700',
  ending: 'bg-red-50 text-red-600',
}

/**
 * お気に入り・行く予定タブ用のコンパクトな一覧。
 * 1件ごとに 制作元・開催期間・何時から参加できるか・場所 をまとめて見せ、
 * その場でステータスを動かせるボタンを付ける。
 */
export default function EventRowList({ events, variant, onChangeStatus }: EventRowListProps) {
  return (
    <ul className="bg-white rounded-3xl shadow-soft overflow-hidden divide-y divide-gray-100">
      {events.map((event) => {
        const schedule = getScheduleLabel(event.start_date, event.end_date)
        return (
          <li key={event.id} className="relative">
            <Link
              href={`/events/${event.id}`}
              className="block px-4 pt-4 pb-3 sm:px-6 hover:bg-orange-50/60 active:bg-orange-50 transition-colors"
            >
              <h3 className={`font-bold text-gray-800 leading-snug line-clamp-2 ${variant === 'favorite' ? 'pr-10' : ''}`}>
                {event.title}
              </h3>

              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="sr-only">制作元：</span>
                  <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />
                  <span className={event.maker ? 'font-semibold text-gray-700' : 'text-gray-400'}>
                    {event.maker || '制作元 未登録'}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="sr-only">開催期間：</span>
                  <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{formatShortDateRange(event.start_date, event.end_date)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TONE_CLASS[schedule.tone]}`}>
                      {schedule.text}
                    </span>
                  </span>
                </div>

                {hasOpeningHours(event.opening_hours) && (
                  <div className="flex items-start gap-2">
                    <span className="sr-only">参加できる時間：</span>
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" aria-hidden />
                    <span className="text-blue-700">{event.opening_hours}</span>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-start gap-2">
                    <span className="sr-only">場所：</span>
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden />
                    <span className="line-clamp-2">{event.location}</span>
                  </div>
                )}
              </div>
            </Link>

            {variant === 'favorite' && (
              <button
                onClick={() => onChangeStatus(event, 'none')}
                className="absolute top-3 right-3 p-2 rounded-full text-soft-coral hover:bg-pink-50 active:scale-95 transition"
                aria-label="お気に入りから外す"
                title="お気に入りから外す"
              >
                <Heart className="w-5 h-5 fill-current" />
              </button>
            )}

            <div className="px-4 pb-4 sm:px-6 flex sm:justify-end">
              {variant === 'favorite' ? (
                <button
                  onClick={() => onChangeStatus(event, 'planned')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-2xl font-semibold text-white bg-gradient-to-r from-orange-400 to-pink-400 hover:opacity-90 active:scale-[0.98] transition"
                >
                  <PawPrint className="w-4 h-4" />
                  <span>行く予定にする</span>
                </button>
              ) : (
                <button
                  onClick={() => onChangeStatus(event, 'favorite')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-2xl text-sm font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 active:scale-[0.98] transition"
                >
                  <Heart className="w-4 h-4" />
                  <span>お気に入りに戻す</span>
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
