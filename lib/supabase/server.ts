import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 컴포넌트 / Server Action / Route Handler 용 Supabase 클라이언트.
 *
 * 세션은 쿠키에 저장되므로, 요청마다 새로 만들어 써야 한다 (전역 변수로 재사용 금지).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서 호출된 경우 쿠키를 쓸 수 없다.
            // 미들웨어가 세션 갱신을 대신 처리하므로 무시해도 안전하다.
          }
        },
      },
    }
  )
}
