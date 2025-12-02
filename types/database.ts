export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          url: string
          image_url: string | null
          start_date: string
          end_date: string | null
          location: string | null
          area: string | null
          type: string | null
          maker: string | null
          price: string | null
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          url: string
          image_url?: string | null
          start_date: string
          end_date?: string | null
          location?: string | null
          area?: string | null
          type?: string | null
          maker?: string | null
          price?: string | null
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          url?: string
          image_url?: string | null
          start_date?: string
          end_date?: string | null
          location?: string | null
          area?: string | null
          type?: string | null
          maker?: string | null
          price?: string | null
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_event_logs: {
        Row: {
          id: string
          user_id: string
          event_id: string
          status: 'FAVORITE' | 'WENT'
          result: 'CLEAR' | 'FAIL' | null
          rating: number | null
          memo: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          status: 'FAVORITE' | 'WENT'
          result?: 'CLEAR' | 'FAIL' | null
          rating?: number | null
          memo?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          status?: 'FAVORITE' | 'WENT'
          result?: 'CLEAR' | 'FAIL' | null
          rating?: number | null
          memo?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      events_with_stats: {
        Row: {
          id: string
          title: string
          url: string
          image_url: string | null
          start_date: string
          end_date: string | null
          location: string | null
          area: string | null
          type: string | null
          maker: string | null
          price: string | null
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          favorite_count: number
          went_count: number
          current_status: string
          days_until_end: number | null
        }
      }
    }
  }
}

