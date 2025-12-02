'use client'

import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EventCard } from '@/types/event'

interface LogEventModalProps {
  event: EventCard
  onClose: () => void
}

export default function LogEventModal({ event, onClose }: LogEventModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    result: 'CLEAR' as 'CLEAR' | 'FAIL' | null,
    rating: 5,
    memo: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        return
      }

      const { error } = await supabase
        .from('user_event_logs')
        .upsert({
          user_id: user.id,
          event_id: event.id,
          status: 'WENT',
          result: formData.result,
          rating: formData.rating,
          memo: formData.memo || null,
        })

      if (error) {
        console.error('Error logging event:', error)
        alert('記録の保存に失敗しました')
      } else {
        router.refresh()
        onClose()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">行った記録</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">{event.title}</p>
          </div>

          {/* 結果 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              結果
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, result: 'CLEAR' })}
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-colors ${
                  formData.result === 'CLEAR'
                    ? 'bg-mint-green text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ✅ クリア
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, result: 'FAIL' })}
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold transition-colors ${
                  formData.result === 'FAIL'
                    ? 'bg-soft-coral text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ❌ 失敗
              </button>
            </div>
          </div>

          {/* 評価 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              評価
            </label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating })}
                  className="p-2 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      rating <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">
              {formData.rating} / 5
            </p>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メモ（内輪向け情報）
            </label>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="例: 歩きやすい靴推奨、ランチは○○がおすすめ"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.result}
              className="flex-1 px-6 py-3 bg-pastel-orange text-white rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isLoading ? '保存中...' : '記録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

