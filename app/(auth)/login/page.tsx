import { LoginForm } from './login-form'

const MESSAGES: Record<string, string> = {
  'invalid-link':
    '확인 링크가 유효하지 않거나 만료되었습니다. 다시 로그인하거나 가입을 진행해주세요.',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const rawRedirect = params.redirectTo
  const redirectTo = typeof rawRedirect === 'string' ? rawRedirect : '/'

  const rawMessage = params.message
  const message =
    typeof rawMessage === 'string' ? MESSAGES[rawMessage] : undefined

  return (
    <>
      <h2 className="mb-1 text-base font-bold text-gray-900">로그인</h2>
      <p className="mb-5 text-sm text-gray-500">직원 계정으로 로그인하세요.</p>

      {message && (
        <p
          role="status"
          data-testid="page-message"
          className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          {message}
        </p>
      )}

      <LoginForm redirectTo={redirectTo} />
    </>
  )
}
