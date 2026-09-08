'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { PLANS, formatPrice, calculateEndDate } from '@/lib/memberships/plans'
import {
  STATUS_LABEL,
  describeMembership,
  type MembershipStatus,
} from '@/lib/memberships/status'
import {
  createMembership,
  deleteMembership,
  type MembershipFormState,
} from './membership-actions'

export type MembershipRow = {
  id: string
  plan_code: string | null
  plan_name: string | null
  price: number | null
  sessions_per_week: number | null
  start_date: string
  end_date: string | null
}

const STATUS_STYLE: Record<MembershipStatus, string> = {
  active: 'bg-green-50 text-green-700',
  expiring_soon: 'bg-amber-50 text-amber-800',
  expired: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      data-testid="membership-status"
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? '등록 중…' : '회원권 등록'}
    </button>
  )
}

export function MembershipSection({
  memberId,
  memberships,
  today,
}: {
  memberId: string
  memberships: MembershipRow[]
  today: string
}) {
  const [adding, setAdding] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0].code as string)
  const [startDate, setStartDate] = useState(today)

  const [state, formAction] = useActionState<MembershipFormState, FormData>(
    async (prev, formData) => {
      const result = await createMembership(memberId, prev, formData)
      if (!result.error) setAdding(false)
      return result
    },
    {}
  )

  const plan = PLANS.find((p) => p.code === selectedPlan) ?? PLANS[0]
  const previewEnd =
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    !Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))
      ? calculateEndDate(startDate, plan.durationMonths)
      : null

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700">회원권</h2>
        {!adding && (
          <button
            type="button"
            data-testid="add-membership"
            onClick={() => setAdding(true)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            회원권 등록
          </button>
        )}
      </div>

      {memberships.length === 0 && !adding && (
        <p className="mt-4 text-sm text-gray-500">등록된 회원권이 없습니다.</p>
      )}

      {memberships.length > 0 && (
        <ul data-testid="membership-list" className="mt-4 space-y-2">
          {memberships.map((membership) => {
            const { status, remainingDays } = describeMembership(membership, today)
            return (
              <li
                key={membership.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {membership.plan_name ?? '회원권'}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {membership.start_date} ~ {membership.end_date ?? '-'}
                    {membership.sessions_per_week
                      ? ` · 주 ${membership.sessions_per_week}회`
                      : ''}
                    {membership.price != null ? ` · ${formatPrice(membership.price)}` : ''}
                  </p>
                  {remainingDays !== null && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {remainingDays >= 0
                        ? `${remainingDays}일 남음`
                        : `${Math.abs(remainingDays)}일 지남`}
                    </p>
                  )}
                </div>

                <form action={deleteMembership.bind(null, memberId, membership.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-gray-400 underline-offset-2 transition hover:text-red-600 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      )}

      {adding && (
        <form action={formAction} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">요금제 선택</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PLANS.map((option) => (
                <label
                  key={option.code}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition ${
                    selectedPlan === option.code
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="plan_code"
                      value={option.code}
                      checked={selectedPlan === option.code}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="accent-gray-900"
                    />
                    <span className="text-sm text-gray-900">{option.name}</span>
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {formatPrice(option.price)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="start_date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              시작일
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 sm:w-56"
            />
            {previewEnd && (
              <p data-testid="end-date-preview" className="mt-1 text-xs text-gray-500">
                종료일: <strong>{previewEnd}</strong> (주 {plan.sessionsPerWeek}회 ·{' '}
                {formatPrice(plan.price)})
              </p>
            )}
          </div>

          {state.error && (
            <p
              role="alert"
              data-testid="membership-error"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <SubmitButton />
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
