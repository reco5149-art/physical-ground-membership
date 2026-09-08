'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AuthFormState = {
  error?: string
  notice?: string
}

/**
 * 로그인 후 돌려보낼 경로를 검증한다.
 *
 * `redirectTo`는 URL 쿼리로 들어오는 값이라 그대로 믿으면 오픈 리다이렉트 취약점이 된다.
 * (예: /login?redirectTo=https://evil.example → 로그인 직후 외부 사이트로 튕김)
 * 반드시 우리 사이트 내부의 절대경로(`/...`)만 허용한다.
 */
function safeRedirectPath(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/'
  // 반드시 '/'로 시작하고, '//' 또는 '/\' 로 시작하는 프로토콜 상대 URL은 거부
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

function getEmailAndPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  return { email, password }
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = getEmailAndPassword(formData)
  const redirectTo = safeRedirectPath(formData.get('redirectTo'))

  // 서버 측 검증 — 브라우저 유효성 검사는 우회될 수 있으므로 여기서 다시 확인한다.
  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // 계정 존재 여부를 알려주지 않기 위해 항상 동일한 문구를 쓴다.
    // (이메일 미확인 상태만은 사용자가 조치할 수 있어야 하므로 예외적으로 안내한다)
    if (error.code === 'email_not_confirmed') {
      return {
        error:
          '이메일 확인이 완료되지 않았습니다. 가입 시 받은 확인 메일의 링크를 먼저 눌러주세요.',
      }
    }
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const { email, password } = getEmailAndPassword(formData)
  const passwordConfirm = String(formData.get('passwordConfirm') ?? '')

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }
  if (password !== passwordConfirm) {
    return { error: '비밀번호가 서로 일치하지 않습니다.' }
  }
  // 최소 길이는 Supabase 대시보드 설정이 최종 방어선이며(Module 8에서 강화),
  // 여기서는 사용자에게 즉시 피드백을 주기 위한 1차 확인만 한다.
  if (password.length < 8) {
    return { error: '비밀번호는 8자 이상이어야 합니다.' }
  }

  const origin = (await headers()).get('origin')
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 확인 메일의 링크가 돌아올 주소
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  })

  if (error) {
    // 원인 파악을 위해 서버 로그에만 남긴다 (사용자 화면에는 노출하지 않음)
    console.error('[signup] supabase error:', error.code, error.message)

    // 비밀번호 정책 위반 등 사용자가 고칠 수 있는 오류는 그대로 전달
    if (error.code === 'weak_password') {
      return { error: '비밀번호가 너무 단순합니다. 더 복잡하게 설정해주세요.' }
    }
    if (error.code === 'over_email_send_rate_limit') {
      return {
        error:
          '메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      }
    }
    return { error: '가입에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  // 이미 가입된 이메일인지 여부를 노출하지 않기 위해, 성공/중복 모두 같은 안내를 보여준다.
  return {
    notice:
      '확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료한 뒤 로그인해주세요.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
