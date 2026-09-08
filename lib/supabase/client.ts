import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 *
 * 여기서 쓰는 키는 공개되어도 되는 publishable key이며,
 * 실제 데이터 접근 통제는 DB의 RLS 정책이 담당한다. (TECH_SPEC 3.3, 8.1)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
