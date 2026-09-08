import { createClient } from '@/lib/supabase/server'

/**
 * 대시보드(홈) — 보호된 페이지.
 *
 * Module 2에서는 "인증 가드가 실제로 동작하는가"를 확인하기 위한 최소 화면만 둔다.
 * 실제 대시보드 지표(오늘 출석 수, 만료임박 회원 등)는 Module 7에서 구현한다.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <h1 className="text-2xl font-bold">피지컬그라운드 회원관리</h1>
      <p className="mt-2 text-sm text-gray-500">
        보호된 페이지입니다. 로그인한 직원만 볼 수 있습니다.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">현재 세션</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-gray-500">이메일</dt>
            <dd data-testid="user-email">{user?.email ?? '-'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-gray-500">사용자 ID</dt>
            <dd className="break-all font-mono text-xs">{user?.id ?? '-'}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Module 2 (인증 가드) 확인용 화면 · 실제 대시보드는 Module 7에서 구현 예정
      </p>
    </main>
  )
}
