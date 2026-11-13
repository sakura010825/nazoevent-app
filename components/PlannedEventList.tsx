import Link from 'next/link'
import { Building2, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react'
import { EventCard } from '@/types/event'
import { formatShortDateRange, getScheduleLabel, hasOpeningHours, ScheduleTone } from '@/lib/utils/event'

interface PlannedEventListProps {
  events: EventCard[]
}

const TONE_CLASS: Record<ScheduleTone, string> = {
  upcoming: 'bg-blue-50 text-blue-700',
  ongoing: 'bg-green-50 text-green-700',
  ending: 'bg-red-50 text-red-600',
}

/**
 * 「行く予定」タブ用のコンパクトな一覧。
 * 1件ごとに 制作元・開催期間・何時から参加できるか・場所 をまとめて見せる。
 */
export default function PlannedEventList({ events }: PlannedEventListProps) {
  return (
    <ul className="bg-white rounded-3xl shadow-soft overflow-hidden divide-y divide-gray-100">
      {events.map((event) => {
        const schedule = getScheduleLabel(event.start_date, event.end_date)
        return (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex items-center gap-3 px-4 py-4 sm:px-6 hover:bg-orange-50/60 active:bg-orange-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 leading-snug line-clamp-2">{event.title}</h3>

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
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-300" aria-hidden />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
