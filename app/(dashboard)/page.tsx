import { createClient } from '@/lib/supabase/server'
import { logout } from '../(auth)/actions'

/**
 * 대시보드(홈) — 보호된 페이지.
 *
 * Module 3까지는 인증 흐름 확인용 최소 화면이다.
 * 실제 대시보드 지표(오늘 출석 수, 만료임박 회원 등)는 Module 7에서 구현한다.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">피지컬그라운드 회원관리</h1>
          <p className="mt-2 text-sm text-gray-500">
            보호된 페이지입니다. 로그인한 직원만 볼 수 있습니다.
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            data-testid="logout-button"
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            로그아웃
          </button>
        </form>
      </div>

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
        Module 3 (인증 화면) 확인용 화면 · 실제 대시보드는 Module 7에서 구현 예정
      </p>
    </main>
  )
}
