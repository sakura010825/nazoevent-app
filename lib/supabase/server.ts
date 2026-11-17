import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

/**
 * サーバー（Server Component / Route Handler）用の Supabase クライアント。
 * ブラウザがCookieに保存したログイン情報を読む。
 *
 * 注意: インストールされている @supabase/ssr は 0.1.0 で、Cookie は get / set / remove で渡す。
 * 新しい版の getAll / setAll を渡すと無視され、サーバー側では常に「未ログイン」扱いになる。
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component から呼ばれた場合は書き込めない（middleware がセッションを更新するので問題なし）
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // 同上
          }
        },
      },
    }
  )
}
