'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signup, type AuthFormState } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? '가입 중…' : '회원가입'}
    </button>
  )
}

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signup,
    {}
  )

  // 가입 신청이 접수되면 폼 대신 안내만 보여준다.
  if (state.notice) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          data-testid="signup-notice"
          className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800"
        >
          {state.notice}
        </p>
        <a
          href="/login"
          className="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          로그인 화면으로
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <p className="mt-1 text-xs text-gray-400">8자 이상 입력해주세요.</p>
      </div>

      <div>
        <label
          htmlFor="passwordConfirm"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          비밀번호 확인
        </label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          data-testid="form-error"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="pt-2 text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="font-medium text-gray-900 underline">
          로그인
        </a>
      </p>
    </form>
  )
}
