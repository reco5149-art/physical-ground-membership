import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

/**
 * 대시보드(홈).
 *
 * 실제 지표(오늘 출석 수, 만료임박 회원 등)는 Module 7에서 구현한다.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { count } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  return (
    <main>
      <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
      <p className="mt-1 text-sm text-gray-500">
        {user?.email} 님으로 로그인되어 있습니다.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/members"
          className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-400"
        >
          <p className="text-sm text-gray-500">활성 회원</p>
          <p data-testid="active-member-count" className="mt-1 text-2xl font-bold text-gray-900">
            {count ?? 0}명
          </p>
          <p className="mt-2 text-xs text-gray-400">회원 관리로 이동 →</p>
        </Link>

        <div className="rounded-lg border border-dashed border-gray-300 p-5">
          <p className="text-sm text-gray-400">
            오늘 출석 수, 회원권 만료임박 목록 등은 Module 7에서 추가됩니다.
          </p>
        </div>
      </div>
    </main>
  )
}
