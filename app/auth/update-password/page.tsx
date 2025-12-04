'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setMessage('パスワードを更新しました。ログイン画面に移動します。')
      setTimeout(() => {
        router.push('/auth')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'パスワード更新中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          新しいパスワードを設定
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          メールから遷移していることを確認し、新しいパスワードを入力してください。
        </p>

        {message && (
          <div className="mb-4 bg-mint-green bg-opacity-20 text-mint-green px-4 py-2 rounded-2xl text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-soft-coral bg-opacity-20 text-soft-coral px-4 py-2 rounded-2xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              新しいパスワード
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-pastel-orange text-white py-3 rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isLoading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    </div>
  )
}








