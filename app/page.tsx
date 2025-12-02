import { createClient } from '@/lib/supabase/server'
import EventList from '@/components/EventList'
import HeaderAuth from '@/components/HeaderAuth'
import AuthStatus from '@/components/AuthStatus'

export default async function Home() {
  const supabase = await createClient()
  
  // 認証状態を確認
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // デバッグ用（本番環境では削除）
  if (authError) {
    console.error('Auth error:', authError)
  }
  console.log('User:', user ? 'Logged in' : 'Not logged in')
  
  // イベント一覧を取得（終了していないイベントのみ、開催日順）
  const today = new Date().toISOString().split('T')[0]
  const { data: events, error } = await supabase
    .from('events_with_stats')
    .select('*')
    .or(`end_date.gte.${today},end_date.is.null`) // 終了していないイベントまたは常設イベント
    .order('start_date', { ascending: true }) // 開催日順（早い順）
    .order('created_at', { ascending: false }) // 同じ開催日の場合は新しい順

  // ユーザーのお気に入り情報を取得
  let favoriteEventIds: string[] = []
  if (user?.id) {
    const userId = user.id
    const { data: favorites } = await supabase
      .from('user_event_logs')
      .select('event_id')
      .eq('user_id', userId as any)
      .eq('status', 'FAVORITE' as any)
    favoriteEventIds = (favorites as any)?.map((f: any) => f.event_id) || []
  }

  // イベントにお気に入り情報を追加
  const eventsWithFavorite = (events || []).map((event: any) => ({
    ...event,
    isFavorite: favoriteEventIds.includes(event.id),
  }))

  if (error) {
    console.error('Error fetching events:', error)
  }

  return (
    <main className="min-h-screen bg-cream">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">NazoNote</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <HeaderAuth />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        <EventList events={eventsWithFavorite} />
      </div>

      {/* デバッグ用：認証状態表示（開発環境のみ） */}
      <AuthStatus />
    </main>
  )
}

