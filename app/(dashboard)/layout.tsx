import Link from 'next/link'
import { logout } from '../(auth)/actions'

const NAV = [
  { href: '/', label: '대시보드' },
  { href: '/members', label: '회원 관리' },
  { href: '/attendance', label: '출석 체크' },
]

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-gray-900">
              피지컬그라운드
            </Link>
            <nav className="flex items-center gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-gray-600 transition hover:text-gray-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <form action={logout}>
            <button
              type="submit"
              data-testid="logout-button"
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-8">{children}</div>
    </div>
  )
}
