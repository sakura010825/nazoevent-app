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


const DAY_MS = 24 * 60 * 60 * 1000

/** 'YYYY-MM-DD' を UTC 0時のタイムスタンプにする（タイムゾーンで日付がずれないように） */
function toDateValue(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** 日本時間の「今日」を UTC 0時のタイムスタンプで返す（サーバー=UTC でもブラウザでも同じ値になる） */
function todayValueJst(): number {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** 今日（日本時間）から指定日までの日数。過去ならマイナス */
export function daysFromToday(date: string): number {
  return Math.round((toDateValue(date) - todayValueJst()) / DAY_MS)
}

/** 一覧用の短い日付「11/13(金)」。今年以外は年も付ける「2027/1/31(日)」 */
export function formatShortDate(date: string): string {
  const value = new Date(toDateValue(date))
  const sameYear = value.getUTCFullYear() === new Date(todayValueJst()).getUTCFullYear()
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][value.getUTCDay()]
  const md = `${value.getUTCMonth() + 1}/${value.getUTCDate()}(${weekday})`
  return sameYear ? md : `${value.getUTCFullYear()}/${md}`
}

/** 一覧用の短い期間「11/13(金)〜2027/1/31(日)」。終了日なしは「10/9(金)〜」 */
export function formatShortDateRange(startDate: string, endDate: string | null): string {
  if (!endDate) return `${formatShortDate(startDate)}〜`
  return `${formatShortDate(startDate)}〜${formatShortDate(endDate)}`
}

export type ScheduleTone = 'upcoming' | 'ongoing' | 'ending'

/** 「あと◯日で開始」「あと◯日で終了」などの開催状況ラベル */
export function getScheduleLabel(startDate: string, endDate: string | null): { text: string; tone: ScheduleTone } {
  const untilStart = daysFromToday(startDate)
  if (untilStart > 0) {
    return { text: untilStart === 1 ? '明日から' : `あと${untilStart}日で開始`, tone: 'upcoming' }
  }
  if (!endDate) {
    return { text: untilStart === 0 ? '今日から開催' : '開催中（終了日未定）', tone: 'ongoing' }
  }
  const untilEnd = daysFromToday(endDate)
  if (untilEnd <= 0) return { text: '今日まで！', tone: 'ending' }
  if (untilEnd <= 14) return { text: `あと${untilEnd}日で終了`, tone: 'ending' }
  if (untilStart === 0) return { text: `今日から開催・あと${untilEnd}日`, tone: 'ongoing' }
  return { text: `開催中・あと${untilEnd}日`, tone: 'ongoing' }
}

/** opening_hours の「情報なし」マーカー（バックフィルで取得できなかったもの） */
export function hasOpeningHours(openingHours: string | null | undefined): openingHours is string {
  return !!openingHours && openingHours !== 'none'
}
