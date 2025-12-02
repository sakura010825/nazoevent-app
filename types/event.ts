import { Database } from './database'

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type UserEventLog = Database['public']['Tables']['user_event_logs']['Row']
export type UserEventLogInsert = Database['public']['Tables']['user_event_logs']['Insert']
export type UserEventLogUpdate = Database['public']['Tables']['user_event_logs']['Update']

export type EventWithStats = Database['public']['Views']['events_with_stats']['Row']

export type EventStatus = '開催中' | '開催予定' | '終了'

export interface EventCard extends EventWithStats {
  isFavorite?: boolean
  userLog?: UserEventLog | null
}

