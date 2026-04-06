import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Calendar, ExternalLink, ArrowLeft, PawPrint, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDateRange } from '@/lib/utils/event'
import HeaderAuth from '@/components/HeaderAuth'
import EventActions from '@/components/EventActions'
import EventImage from '@/components/EventImage'
import EventDetailActions from '@/components/EventDetailActions'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  
  // イベント情報を取得
  const { data: event, error } = await supabase
    .from('events_with_stats')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !event) {
    notFound()
  }

  // ユーザーのお気に入り情報を取得
  const { data: { user } } = await supabase.auth.getUser()
  let isFavorite = false
  if (user?.id) {
    const { data: favorite } = await supabase
      .from('user_event_logs')
      .select('id')
      .eq('user_id', user.id as any)
      .eq('event_id', event.id)
      .eq('status', 'FAVORITE' as any)
      .single()
    isFavorite = !!favorite
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--background, #FFFBF0)' }}>
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">NazoNote</h1>
          </Link>
          <HeaderAuth />
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* イベント画像 */}
          <div className="relative h-64 sm:h-96 bg-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden mb-6">
            <EventImage imageUrl={event.image_url} title={event.title} />
          </div>

          {/* イベント情報 */}
          <div className="bg-white rounded-3xl shadow-soft-md p-6 sm:p-8">
            <div className="flex items-start gap-3 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex-1">
                {event.title}
              </h1>
              {(event as any).is_purchased && (
                <div className="transform rotate-12 hover:rotate-6 hover:scale-110 transition-all duration-300 hover:animate-bounce">
                  <div className="bg-gradient-to-br from-orange-400 via-pink-400 to-orange-500 p-3 rounded-full shadow-lg">
                    <PawPrint className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* 基本情報 */}
            <div className="space-y-4 mb-6">
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">開催場所</div>
                    <div className="text-gray-800">{event.location}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-gray-500 mb-1">開催期間</div>
                  <div className="text-gray-800">{formatDateRange(event.start_date, event.end_date)}</div>
                </div>
              </div>

              {event.area && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">エリア</div>
                    <div className="text-gray-800">{event.area}</div>
                  </div>
                </div>
              )}

              {event.type && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">タイプ</div>
                    <div className="text-gray-800">{event.type}</div>
                  </div>
                </div>
              )}

              {event.maker && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">制作団体</div>
                    <div className="text-gray-800">{event.maker}</div>
                  </div>
                </div>
              )}

              {event.price && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">価格</div>
                    <div className="text-lg font-semibold text-pastel-orange">{event.price}</div>
                  </div>
                </div>
              )}

              {(event as any).opening_hours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">プレイ可能時間</div>
                    <div className="text-blue-600 font-medium">{(event as any).opening_hours}</div>
                  </div>
                </div>
              )}

              {(event as any).duration_text && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">所要時間</div>
                    <div className="text-gray-800">{(event as any).duration_text}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 説明 */}
            {event.description && (
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-3">ストーリー・概要</h2>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </div>
              </div>
            )}

            {/* 外部サイトリンク: official_url があればそちらを優先、なければ url を使用 */}
            {((event as any).official_url || event.url) && (
              <div className="mb-6 pt-6 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={(event as any).official_url || event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pastel-orange text-white rounded-2xl font-semibold hover:bg-opacity-90 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>公式サイトで確認する</span>
                </a>
                {(event as any).official_url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ナゾヒロバで見る</span>
                  </a>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <EventActions event={event as any} initialIsFavorite={isFavorite} />
              <EventDetailActions event={event as any} />
            </div>

            {/* 統計情報 */}
            {(event.favorite_count > 0 || event.went_count > 0) && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
                {event.favorite_count > 0 && (
                  <span>❤️ {event.favorite_count}人が気になる</span>
                )}
                {event.went_count > 0 && (
                  <span>🚩 {event.went_count}人が行った</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

