'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import type { MembershipStatus } from '@/lib/memberships/status'
import { warningMessage, type CheckInWarning } from '@/lib/attendance/warnings'
import { checkIn } from './actions'

export type CheckInCandidate = {
  id: string
  name: string
  phone: string
  planName: string | null
  membershipStatus: MembershipStatus | null
  endDate: string | null
  sessionsPerWeek: number | null
  thisWeekCount: number
  todayCheckedInTime: string | null
}

export function CheckInPanel({
  candidate,
  statusClassName,
  statusLabel,
}: {
  candidate: CheckInCandidate
  statusClassName: string
  statusLabel: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [warnings, setWarnings] = useState<CheckInWarning[] | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(confirmed: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await checkIn(candidate.id, confirmed)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.checkedIn) {
        setDone(true)
        setWarnings(null)
        return
      }
      setWarnings(result.warnings ?? [])
    })
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/members/${candidate.id}`}
              className="font-medium text-gray-900 underline-offset-2 hover:underline"
            >
              {candidate.name}
            </Link>
            {statusLabel && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName}`}
              >
                {statusLabel}
              </span>
            )}
            {!statusLabel && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                회원권 없음
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {candidate.phone}
            {candidate.planName ? ` · ${candidate.planName}` : ''}
            {candidate.endDate ? ` · ~${candidate.endDate}` : ''}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            이번 주 출석{' '}
            <strong data-testid={`week-count-${candidate.id}`}>
              {candidate.thisWeekCount}
              {candidate.sessionsPerWeek ? ` / ${candidate.sessionsPerWeek}` : ''}회
            </strong>
            {candidate.todayCheckedInTime && (
              <span className="ml-2 text-amber-700">
                오늘 {candidate.todayCheckedInTime} 출석함
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0">
          {done ? (
            <span
              data-testid="checkin-done"
              className="inline-block rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700"
            >
              출석 완료
            </span>
          ) : (
            <button
              type="button"
              data-testid={`checkin-${candidate.id}`}
              onClick={() => submit(false)}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {pending ? '처리 중…' : '체크인'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {warnings && warnings.length > 0 && !done && (
        <div
          data-testid="checkin-warnings"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3"
        >
          <p className="text-sm font-semibold text-amber-900">확인이 필요합니다</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-amber-800">
            {warnings.map((warning) => (
              <li key={warning.kind}>{warningMessage(warning)}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              data-testid="confirm-checkin"
              onClick={() => submit(true)}
              disabled={pending}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:bg-gray-400"
            >
              {pending ? '처리 중…' : '확인했고, 체크인 진행'}
            </button>
            <button
              type="button"
              onClick={() => setWarnings(null)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
