import { EventStatus } from '@/types/event'
import { format, differenceInDays, isBefore, isAfter, isWithinInterval } from 'date-fns'
import { ja } from 'date-fns/locale'

/**
 * イベントの現在のステータスを判定
 */
export function getEventStatus(startDate: string, endDate: string | null): EventStatus {
  const today = new Date()
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  if (end && isBefore(today, start)) {
    return '開催予定'
  }
  
  if (end && isAfter(today, end)) {
    return '終了'
  }

  if (!end || isWithinInterval(today, { start, end })) {
    return '開催中'
  }

  return '開催中'
}

/**
 * ステータスバッジのテキストと色を取得
 */
export function getStatusBadge(status: EventStatus, daysUntilEnd: number | null) {
  if (status === '開催中' && daysUntilEnd !== null && daysUntilEnd <= 14) {
    return {
      text: daysUntilEnd === 0 ? '今日で終了！' : `あと${daysUntilEnd}日で終了`,
      emoji: '🟠',
      color: 'soft-coral',
    }
  }

  const statusMap: Record<EventStatus, { text: string; emoji: string; color: string }> = {
    '開催中': { text: '開催中', emoji: '🟢', color: 'mint-green' },
    '開催予定': { text: '開催予定', emoji: '🔵', color: 'pastel-orange' },
    '終了': { text: '終了', emoji: '⚪️', color: 'gray-400' },
  }

  return statusMap[status]
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: string | null, formatStr: string = 'yyyy年MM月dd日'): string {
  if (!date) return ''
  return format(new Date(date), formatStr, { locale: ja })
}

/**
 * 日付範囲をフォーマット
 */
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = formatDate(startDate)
  if (!endDate) return `${start}〜（常設）`
  const end = formatDate(endDate)
  return `${start}〜${end}`
}

