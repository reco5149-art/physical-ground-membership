'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { GENDER_OPTIONS, type Member } from '@/lib/members/types'
import type { MemberFormState } from './actions'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? '저장 중…' : label}
    </button>
  )
}

export function MemberForm({
  action,
  member,
  submitLabel,
  cancelHref,
}: {
  action: (state: MemberFormState, formData: FormData) => Promise<MemberFormState>
  member?: Member
  submitLabel: string
  cancelHref: string
}) {
  const [state, formAction] = useActionState<MemberFormState, FormData>(
    action,
    {}
  )

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={member?.name ?? ''}
          maxLength={50}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
          연락처 <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          placeholder="010-1234-5678"
          defaultValue={member?.phone ?? ''}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          숫자만 입력해도 자동으로 형식이 정리됩니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="birth_date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            생년월일
          </label>
          <input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={member?.birth_date ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="gender"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            성별
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={member?.gender ?? ''}
            className={inputClass}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="memo" className="mb-1 block text-sm font-medium text-gray-700">
          메모
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          maxLength={1000}
          defaultValue={member?.memo ?? ''}
          className={inputClass}
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

      <div className="flex items-center gap-2 pt-2">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          취소
        </Link>
      </div>
    </form>
  )
}
