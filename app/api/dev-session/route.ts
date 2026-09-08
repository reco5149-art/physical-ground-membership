import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * ⚠️ 개발 전용 임시 라우트 (Module 2 인증 가드 테스트용)
 *
 * Module 2 시점에는 로그인 화면이 아직 없다(Module 3에서 구현).
 * 인증 가드가 "로그인 상태에서는 통과"하는지 검증하려면 세션 쿠키가 필요하므로,
 * TASK_BREAKDOWN.md Module 2의 테스트 방법("임시 로그인 API 호출로 세션 발급")에 따라
 * 이 라우트를 둔다.
 *
 * 안전장치:
 *  - 프로덕션 빌드에서는 항상 404를 반환한다. 즉 Vercel 배포본에서는 존재하지 않는다.
 *  - 자격증명을 코드에 하드코딩하지 않는다. 호출 시 body로 전달받는다.
 *
 * ✅ Module 3에서 실제 로그인 화면이 만들어지면 이 파일은 삭제한다.
 */

function notFound() {
  return new NextResponse('Not Found', { status: 404 })
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return notFound()

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { action, email, password } = body as {
    action?: string
    email?: string
    password?: string
  }

  const supabase = await createClient()

  if (action === 'logout') {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true, action: 'logout' })
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    action: 'login',
    user: { id: data.user?.id, email: data.user?.email },
  })
}
