/**
 * 로그인 페이지 — Module 2에서는 리다이렉트 대상이 존재하는지 확인하기 위한
 * 자리표시자(placeholder)만 둔다. 실제 로그인 폼과 Supabase Auth 연동은
 * Module 3에서 구현한다.
 */
export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-8">
      <h1 className="text-xl font-bold" data-testid="login-heading">
        로그인
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        직원 계정으로 로그인하세요.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-400">
        로그인 폼은 Module 3에서 구현 예정입니다.
      </div>
    </main>
  )
}
