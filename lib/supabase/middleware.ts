import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** 로그인 없이 접근 가능한 경로 (그 외 모든 경로는 로그인 필요) */
const PUBLIC_PATHS = ['/login', '/signup', '/auth']

/**
 * 개발 환경에서만 공개인 경로.
 * `/api/dev-session`은 로그인 화면이 없는 Module 2에서 인증 가드를 테스트하기 위한
 * 임시 라우트이며, 라우트 자체도 프로덕션에서는 404를 반환한다. (Module 3에서 삭제)
 */
const DEV_ONLY_PUBLIC_PATHS = ['/api/dev-session']

function isPublicPath(pathname: string) {
  const publicPaths =
    process.env.NODE_ENV === 'production'
      ? PUBLIC_PATHS
      : [...PUBLIC_PATHS, ...DEV_ONLY_PUBLIC_PATHS]

  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

/**
 * 매 요청마다 세션을 갱신하고, 비로그인 사용자의 보호된 경로 접근을 차단한다.
 * (TECH_SPEC 3.2절 3번: 접근 제어)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 중요: getUser()는 반드시 호출해야 한다. 이 호출이 세션 토큰을 갱신하고,
  // 쿠키의 내용을 그대로 믿지 않고 Supabase 서버에 사용자 유효성을 검증한다.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublicPath(pathname)) {
    // API 요청은 HTML 리다이렉트가 아니라 401을 반환해야 한다.
    // (리다이렉트로 응답하면 클라이언트가 로그인 화면 HTML을 JSON으로 파싱하려다 깨진다)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 비로그인 + 보호된 화면 → 로그인 페이지로
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // 로그인 후 원래 가려던 곳으로 돌려보내기 위해 기록
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // 로그인 상태인데 로그인/가입 화면 → 대시보드로
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
