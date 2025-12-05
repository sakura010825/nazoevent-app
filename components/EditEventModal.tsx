'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EventCard } from '@/types/event'

interface EditEventModalProps {
  event: EventCard
  onClose: () => void
}

export default function EditEventModal({ event, onClose }: EditEventModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: event.title || '',
    url: event.url || '',
    image_url: event.image_url || '',
    start_date: event.start_date || '',
    end_date: event.end_date || '',
    location: event.location || '',
    area: event.area || '',
    type: event.type || '',
    maker: event.maker || '',
    price: event.price || '',
    description: event.description || '',
    is_purchased: (event as any).is_purchased || false,
  })

  useEffect(() => {
    // イベントデータでフォームを初期化
    setFormData({
      title: event.title || '',
      url: event.url || '',
      image_url: event.image_url || '',
      start_date: event.start_date || '',
      end_date: event.end_date || '',
      location: event.location || '',
      area: event.area || '',
      type: event.type || '',
      maker: event.maker || '',
      price: event.price || '',
      description: event.description || '',
      is_purchased: (event as any).is_purchased || false,
    })
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        return
      }

      // 作成者のみ編集可能（RLSで保護されているが、念のため確認）
      if (event.created_by !== user.id) {
        alert('このイベントを編集する権限がありません')
        return
      }

      const { error } = await supabase
        .from('events')
        .update({
          ...formData,
          end_date: formData.end_date || null,
        })
        .eq('id', event.id)

      if (error) {
        console.error('Error updating event:', error)
        alert('イベントの更新に失敗しました')
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
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">イベントを編集</h2>
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              イベント名 *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                開始日 *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                終了日（常設の場合は空欄）
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              場所
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                エリア
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="例: 東京、神奈川"
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                タイプ
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
              >
                <option value="">選択してください</option>
                <option value="周遊型">周遊型</option>
                <option value="ホール">ホール</option>
                <option value="ルーム">ルーム</option>
                <option value="オンライン">オンライン</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              価格
            </label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="例: 3,500円"
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              画像URL
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          {/* 購入済みチェックボックス */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_purchased"
              checked={formData.is_purchased}
              onChange={(e) => setFormData({ ...formData, is_purchased: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-pastel-orange focus:ring-pastel-orange"
            />
            <label htmlFor="is_purchased" className="text-sm font-semibold text-gray-700">
              チケット購入済み（参加可能）
            </label>
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
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-pastel-orange text-white rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>更新中...</span>
                </>
              ) : (
                '更新する'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


