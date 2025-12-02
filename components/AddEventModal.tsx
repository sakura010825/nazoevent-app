'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ExtractedEvent } from '@/types/extracted-event'
import { triggerConfetti } from '@/lib/utils/confetti'

interface AddEventModalProps {
  onClose: () => void
}

export default function AddEventModal({ onClose }: AddEventModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    image_url: '',
    start_date: '',
    end_date: '',
    location: '',
    area: '',
    type: '',
    maker: '',
    price: '',
    description: '',
  })

  const handleExtractFromUrl = async () => {
    if (!formData.url) {
      alert('URLを入力してください')
      return
    }

    setIsExtracting(true)
    setExtractionError(null)

    try {
      const response = await fetch('/api/extract-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: formData.url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '抽出に失敗しました')
      }

      // 抽出されたデータをフォームに設定
      const extracted: ExtractedEvent = data.data
      setFormData({
        ...formData,
        title: extracted.title || formData.title,
        start_date: extracted.start_date || formData.start_date,
        end_date: extracted.end_date || formData.end_date,
        location: extracted.location || formData.location,
        area: extracted.area || formData.area,
        type: extracted.type || formData.type,
        maker: extracted.maker || formData.maker,
        price: extracted.price || formData.price,
        description: extracted.description || formData.description,
        image_url: extracted.image_url || formData.image_url,
      })
    } catch (error) {
      console.error('Error extracting event:', error)
      setExtractionError(
        error instanceof Error ? error.message : 'イベント情報の抽出に失敗しました'
      )
    } finally {
      setIsExtracting(false)
    }
  }

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
        .from('events')
        .insert({
          ...formData,
          created_by: user.id,
          end_date: formData.end_date || null,
        })

      if (error) {
        console.error('Error creating event:', error)
        alert('イベントの登録に失敗しました')
      } else {
        // 紙吹雪エフェクト
        triggerConfetti()
        // 少し遅延してから閉じる（エフェクトを見せるため）
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 500)
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
          <h2 className="text-2xl font-bold text-gray-800">イベントを追加</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* URL入力と自動抽出 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              URL *
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => {
                  setFormData({ ...formData, url: e.target.value })
                  setExtractionError(null)
                }}
                placeholder="https://example.com/event"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
              />
              <button
                type="button"
                onClick={handleExtractFromUrl}
                disabled={isExtracting || !formData.url}
                className="px-4 py-2 bg-mint-green text-gray-800 rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>抽出中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>自動入力</span>
                  </>
                )}
              </button>
            </div>
            {extractionError && (
              <p className="mt-2 text-sm text-soft-coral">{extractionError}</p>
            )}
            {!extractionError && isExtracting && (
              <p className="mt-2 text-sm text-gray-500">
                AIがイベント情報を抽出しています...
              </p>
            )}
          </div>

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
              className="flex-1 px-6 py-3 bg-pastel-orange text-white rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
            >
              {isLoading ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

