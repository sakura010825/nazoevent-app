'use client'

import { EventCard } from '@/types/event'
import EventCardComponent from './EventCard'
import PlannedEventList from './PlannedEventList'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { saveListState, takeListScroll } from '@/lib/utils/list-state'

interface EventListProps {
  events: EventCard[]
}

type TabKey = 'new' | 'ending' | 'going' | 'favorite'

const TABS: { key: TabKey; label: string; description: string }[] = [
  { key: 'new', label: '新着順', description: 'アプリに登録された新しい順' },
  { key: 'ending', label: '終了が近い順', description: '終了日が近い順（終了日未定は最後）' },
  { key: 'going', label: '行く予定', description: '終了日が近い順' },
  { key: 'favorite', label: 'お気に入り', description: '終了日が近い順' },
]
const DEFAULT_TAB: TabKey = 'new'

function parseTab(value: string | null): TabKey {
  return TABS.some((t) => t.key === value) ? (value as TabKey) : DEFAULT_TAB
}

/** 終了日が近い順。終了日未定（常設）は最後、同じ終了日なら開始日が早い順 */
function byEndDate(a: EventCard, b: EventCard): number {
  if (a.end_date !== b.end_date) {
    if (a.end_date === null) return 1
    if (b.end_date === null) return -1
    return a.end_date < b.end_date ? -1 : 1
  }
  return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0
}

function byCreatedDesc(a: EventCard, b: EventCard): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

/** 「東京都」と「東京」のような表記ゆれを1つのエリアにまとめる */
function normalizeArea(area: string | null): string | null {
  return area ? area.replace(/[都府県]$/, '') : null
}

function isFavoriteEvent(event: EventCard): boolean {
  return !!event.isFavorite || event.favorite_count > 0
}

export default function EventList({ events }: EventListProps) {
  // タブ・エリアは URL のクエリに持たせる（詳細ページから戻ったときに同じタブで開くため）
  const searchParams = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const areaFilter = searchParams.get('area')

  const tabsAnchorRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  // ページ上部のヘッダー（sticky）の高さを測って、タブをその直下に貼り付ける
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const update = () => setHeaderHeight(header.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  // 詳細ページから戻ってきたら、開く前のスクロール位置に戻す
  useEffect(() => {
    const y = takeListScroll()
    if (y === null) return
    let frame = 0
    let tries = 0
    const restore = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      // 描画が追いつくまで数フレーム待つ
      if (maxY < y && tries < 60) {
        tries++
        frame = requestAnimationFrame(restore)
        return
      }
      window.scrollTo(0, y)
    }
    frame = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(frame)
  }, [])

  const updateQuery = (next: { tab?: TabKey; area?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next.tab !== undefined) {
      if (next.tab === DEFAULT_TAB) params.delete('tab')
      else params.set('tab', next.tab)
    }
    if (next.area !== undefined) {
      if (next.area === null) params.delete('area')
      else params.set('area', next.area)
    }
    const query = params.toString()
    // サーバーへの再取得をせず URL だけ書き換える（Next.js が useSearchParams に反映してくれる）
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)

    // 下までスクロールしていたら、切り替えた一覧の先頭が見える位置まで戻す
    const anchor = tabsAnchorRef.current
    if (anchor) {
      const top = anchor.getBoundingClientRect().top + window.scrollY - headerHeight
      if (window.scrollY > top) window.scrollTo(0, top)
    }
  }

  const areas = useMemo(
    () => Array.from(new Set(events.map((e) => normalizeArea(e.area)).filter(Boolean))) as string[],
    [events]
  )

  const areaEvents = useMemo(
    () => (areaFilter ? events.filter((e) => normalizeArea(e.area) === areaFilter) : events),
    [events, areaFilter]
  )

  const tabEvents = useMemo<Record<TabKey, EventCard[]>>(
    () => ({
      new: [...areaEvents].sort(byCreatedDesc),
      ending: [...areaEvents].sort(byEndDate),
      going: areaEvents.filter((e) => e.is_purchased).sort(byEndDate),
      favorite: areaEvents.filter(isFavoriteEvent).sort(byEndDate),
    }),
    [areaEvents]
  )

  const visibleEvents = tabEvents[tab]
  const currentTab = TABS.find((t) => t.key === tab)!

  return (
    <div
      // カード・行のどれをタップしても、開く直前の一覧の状態を保存する
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest('a[href^="/events/"]')
        if (link) saveListState(link.getAttribute('href')!)
      }}
    >
      <div ref={tabsAnchorRef} aria-hidden />

      {/* タブ（ヘッダーの下に貼り付く） */}
      <div className="sticky z-[5] -mx-4 px-4 py-2" style={{ top: headerHeight, backgroundColor: 'var(--background, #FFFBF0)' }}>
        <div role="tablist" aria-label="一覧の切り替え" className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 shadow-soft">
          {TABS.map((t) => {
            const active = t.key === tab
            const count = t.key === 'going' || t.key === 'favorite' ? tabEvents[t.key].length : null
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => updateQuery({ tab: t.key })}
                className={`relative px-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                  active ? 'bg-pastel-orange text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
                {count !== null && (
                  <span
                    className={`absolute -top-1.5 -right-0.5 min-w-[1.25rem] px-1 rounded-full text-[10px] leading-5 font-bold ${
                      active ? 'bg-white text-orange-500 ring-1 ring-orange-200' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3 mt-2">
        {/* エリア絞り込み */}
        {areas.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {[null, ...areas].map((area) => {
              const active = areaFilter === area
              return (
                <button
                  key={area ?? 'all'}
                  onClick={() => updateQuery({ area })}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    active ? 'bg-mint-green text-gray-800' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-soft'
                  }`}
                >
                  {area ?? 'すべてのエリア'}
                </button>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 px-1">
          {visibleEvents.length}件・{currentTab.description}
        </p>

        {visibleEvents.length === 0 ? (
          <div className="text-center py-12">
            {tab === 'going' ? (
              <>
                <p className="text-gray-500 text-lg">行く予定のイベントはまだありません</p>
                <p className="text-gray-400 text-sm mt-2">イベントの「行く予定🐾」ボタンで追加できます</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg">イベントが見つかりませんでした</p>
                <p className="text-gray-400 text-sm mt-2">新しいイベントを追加してみましょう！</p>
              </>
            )}
          </div>
        ) : tab === 'going' ? (
          <PlannedEventList events={visibleEvents} />
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEvents.map((event) => (
              <EventCardComponent key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
