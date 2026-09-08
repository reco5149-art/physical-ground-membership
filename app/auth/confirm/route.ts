import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 가입 확인 메일의 링크가 돌아오는 지점.
 *
 * Supabase가 붙여 보내는 `token_hash` / `type` 을 검증해 세션을 만든다.
 * 성공하면 대시보드로, 실패(만료·위조된 링크 등)하면 로그인 화면에 안내와 함께 돌려보낸다.
 *
 * 메일 템플릿과 커스텀 SMTP 설정은 Module 8에서 다룬다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!token_hash || !type) {
    redirect('/login?message=invalid-link')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    redirect('/login?message=invalid-link')
  }

  redirect('/')
}
