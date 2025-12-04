'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    setError(null)

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/update-password`
          : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      setMessage(
        'パスワード再設定用のメールを送信しました。メールに記載のリンクから手続きを完了してください。'
      )
    } catch (err: any) {
      setError(err.message || 'メール送信中にエラーが発生しました。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          パスワード再設定
        </h1>

        <p className="text-sm text-gray-600 mb-4">
          登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをメールでお送りします。
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
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pastel-orange"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-pastel-orange text-white py-3 rounded-2xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isLoading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/auth" className="text-pastel-orange hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}








