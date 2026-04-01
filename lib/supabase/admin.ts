import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Supabase管理者クライアント（サービスロールキー使用）
 * RLSをバイパスしてサーバーサイドから直接DB操作を行う
 * 自動クロール登録など、ユーザーセッションが不要な処理に使用
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
