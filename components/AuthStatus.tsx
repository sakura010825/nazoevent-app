'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthStatus() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Client-side user:', user ? 'Logged in' : 'Not logged in', user)
      setUser(user)
      setLoading(false)
    }

    checkUser()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user ? 'Logged in' : 'Not logged in')
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg text-xs border">
      <div>Auth Status: {user ? '✅ Logged in' : '❌ Not logged in'}</div>
      {user && <div className="mt-1 text-gray-500">Email: {user.email}</div>}
    </div>
  )
}

