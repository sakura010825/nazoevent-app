'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // ページを完全にリロードして認証状態を反映
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
    >
      ログアウト
    </button>
  )
}

