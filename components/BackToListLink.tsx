'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getReturnTarget } from '@/lib/utils/list-state'

interface BackToListLinkProps {
  className?: string
  children: React.ReactNode
}

/**
 * 詳細ページ左上の「← NazoNote」。
 * 一覧から開いたときはブラウザの「戻る」と同じ動きにして、選んでいたタブ・スクロール位置に戻す。
 */
export default function BackToListLink({ className, children }: BackToListLinkProps) {
  const router = useRouter()

  return (
    <Link
      href="/"
      className={className}
      onClick={(e) => {
        const target = getReturnTarget()
        if (!target) return // 直接開いた場合は通常どおりトップへ
        e.preventDefault()
        if (target.cameFromList && window.history.length > 1) {
          router.back()
        } else {
          router.push(target.listUrl)
        }
      }}
    >
      {children}
    </Link>
  )
}
