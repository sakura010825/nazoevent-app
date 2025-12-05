'use client'

import { EventCard } from '@/types/event'
import EventCardComponent from './EventCard'
import { useState, useMemo } from 'react'
import { Filter, ArrowUpDown } from 'lucide-react'

interface EventListProps {
  events: EventCard[]
}

type SortOption = 
  | 'created_desc' 
  | 'created_asc' 
  | 'event_date_asc' 
  | 'event_date_desc' 
  | 'title_asc'
  | 'end_date_asc'
  | 'end_date_desc'

export default function EventList({ events: initialEvents }: EventListProps) {
  const [filter, setFilter] = useState<'all' | 'favorite' | 'ongoing'>('all')
  const [areaFilter, setAreaFilter] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('event_date_asc')

  // フィルター適用とソート
  const filteredEvents = useMemo(() => {
    let filtered = initialEvents.filter((event) => {
      if (filter === 'favorite' && (!event.isFavorite && event.favorite_count === 0)) {
        return false
      }
      if (filter === 'ongoing' && event.current_status !== '開催中') {
        return false
      }
      if (areaFilter && event.area !== areaFilter) {
        return false
      }
      return true
    })

    // ソート適用
    filtered = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'event_date_asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        case 'event_date_desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        case 'title_asc':
          return a.title.localeCompare(b.title, 'ja')
        case 'end_date_asc':
          // 終了日が近い順：日付の昇順、未設定（null）は最後
          if (a.end_date === null && b.end_date === null) return 0
          if (a.end_date === null) return 1 // aがnullなら後ろに
          if (b.end_date === null) return -1 // bがnullなら後ろに
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
        case 'end_date_desc':
          // 終了日が遠い順：日付の降順、未設定（null）は最初（無限の未来として扱う）
          if (a.end_date === null && b.end_date === null) return 0
          if (a.end_date === null) return -1 // aがnullなら前に
          if (b.end_date === null) return 1 // bがnullなら前に
          return new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [initialEvents, filter, areaFilter, sortOption])

  // エリア一覧を取得
  const areas = Array.from(new Set(initialEvents.map(e => e.area).filter(Boolean))) as string[]

  return (
    <div className="space-y-6">
      {/* ソート・フィルターバー */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm">
        {/* ソート */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-sm sm:text-base font-semibold text-gray-700">並び替え</span>
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange text-sm sm:text-base"
          >
            <option value="created_desc">作成日（新しい順）</option>
            <option value="created_asc">作成日（古い順）</option>
            <option value="event_date_asc">イベント日（近い順）</option>
            <option value="event_date_desc">イベント日（遠い順）</option>
            <option value="title_asc">タイトル（五十音順）</option>
            <option value="end_date_asc">イベント終了日（近い順）</option>
            <option value="end_date_desc">イベント終了日（遠い順）</option>
          </select>
        </div>

        {/* フィルター */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="text-sm sm:text-base font-semibold text-gray-700">フィルター</span>
          </div>
        
          {/* ステータスフィルター */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-pastel-orange text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter('favorite')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
                filter === 'favorite'
                  ? 'bg-pastel-orange text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              お気に入り❤️
            </button>
            <button
              onClick={() => setFilter('ongoing')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
                filter === 'ongoing'
                  ? 'bg-pastel-orange text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              開催中
            </button>
          </div>

          {/* エリアフィルター */}
          {areas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAreaFilter(null)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
                  areaFilter === null
                    ? 'bg-mint-green text-gray-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                すべてのエリア
              </button>
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
                    areaFilter === area
                      ? 'bg-mint-green text-gray-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* イベントカード一覧 */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">イベントが見つかりませんでした</p>
          <p className="text-gray-400 text-sm mt-2">
            新しいイベントを追加してみましょう！
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <EventCardComponent key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
