'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddEventButton from './AddEventButton'
import LogoutButton from './LogoutButton'
import ColorPalette from './ColorPalette'
import Link from 'next/link'

export default function HeaderAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-gray-100 rounded-2xl text-sm sm:text-base">
        読み込み中...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ColorPalette />
      {user ? (
        <>
          <AddEventButton />
          <LogoutButton />
        </>
      ) : (
        <Link
          href="/auth"
          className="px-3 sm:px-4 py-2 bg-pastel-orange text-white rounded-2xl text-sm sm:text-base font-semibold hover:bg-opacity-90 transition-colors"
        >
          ログイン
        </Link>
      )}
    </div>
  )
}

