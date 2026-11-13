'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * 「行く予定」フラグの切り替え。
 * DB 上は events.is_purchased（旧「チケット購入済み」）を「行く予定」として使っている。
 * イベント単位のフラグなので、ログインしている全員（夫婦）で共有される。
 */
export function usePlannedToggle(eventId: string, initialIsPlanned: boolean) {
  const [isPlanned, setIsPlanned] = useState(initialIsPlanned)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // router.refresh() で最新値が props に来たら追従する
  useEffect(() => {
    setIsPlanned(initialIsPlanned)
  }, [initialIsPlanned])

  const toggle = async () => {
    if (isSaving) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('ログインが必要です')
      return
    }

    const next = !isPlanned
    setIsPlanned(next)
    setIsSaving(true)
    const { error } = await supabase
      .from('events')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_purchased: next } as any)
      .eq('id', eventId)
    setIsSaving(false)

    if (error) {
      console.error('Error toggling planned:', error)
      setIsPlanned(!next)
      alert('「行く予定」の更新に失敗しました')
      return
    }
    // 一覧の「行く予定」タブや、戻ったときの一覧にも反映させる
    router.refresh()
  }

  return { isPlanned, isSaving, toggle }
}
