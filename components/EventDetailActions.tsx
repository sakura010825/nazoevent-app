'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import EditEventModal from './EditEventModal'
import { EventCard } from '@/types/event'

interface EventDetailActionsProps {
  event: EventCard
}

export default function EventDetailActions({ event }: EventDetailActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
    })
  }, [supabase])

  // 作成者のみ編集・削除ボタンを表示
  if (!currentUser || event.created_by !== currentUser.id) {
    return null
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowEditModal(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-2xl font-semibold hover:bg-blue-200 transition-colors"
        >
          <Edit className="w-5 h-5" />
          <span>編集</span>
        </button>
        <button
          onClick={async () => {
            if (window.confirm('このイベントを削除してもよろしいですか？')) {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)

              if (error) {
                console.error('Error deleting event:', error)
                alert('イベントの削除に失敗しました')
              } else {
                router.push('/')
              }
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-2xl font-semibold hover:bg-red-200 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          <span>削除</span>
        </button>
      </div>

      {showEditModal && (
        <EditEventModal
          event={event}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}

