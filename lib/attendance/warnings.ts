/**
 * 체크인 경고 판정 (TECH_SPEC 5.1절 5·6번)
 *
 * 정책(사용자 확정): 아래 상황들은 **차단하지 않고 경고만 표시**한다.
 * 최종 판단은 현장 직원에게 맡긴다.
 */

import type { MembershipStatus } from '@/lib/memberships/status'

export type CheckInWarning =
  | { kind: 'duplicate_today'; lastCheckedInTime: string }
  | { kind: 'weekly_limit'; thisWeekCount: number; sessionsPerWeek: number }
  | { kind: 'membership_expired'; endDate: string | null }
  | { kind: 'no_membership' }

export type CheckInContext = {
  /** 오늘 이미 체크인한 기록의 시각 (KST HH:mm). 없으면 null */
  todayCheckedInTime: string | null
  /** 이번 주(월~일) 출석 횟수 — 이번 체크인은 포함하지 않은 값 */
  thisWeekCount: number
  /** 대표 회원권 정보. 회원권이 없으면 null */
  membership: {
    status: MembershipStatus
    endDate: string | null
    sessionsPerWeek: number | null
  } | null
}

export function evaluateCheckIn(context: CheckInContext): CheckInWarning[] {
  const warnings: CheckInWarning[] = []

  if (!context.membership) {
    warnings.push({ kind: 'no_membership' })
  } else if (context.membership.status === 'expired') {
    warnings.push({
      kind: 'membership_expired',
      endDate: context.membership.endDate,
    })
  }

  if (context.todayCheckedInTime) {
    warnings.push({
      kind: 'duplicate_today',
      lastCheckedInTime: context.todayCheckedInTime,
    })
  }

  const limit = context.membership?.sessionsPerWeek
  if (limit != null && context.thisWeekCount >= limit) {
    warnings.push({
      kind: 'weekly_limit',
      thisWeekCount: context.thisWeekCount,
      sessionsPerWeek: limit,
    })
  }

  return warnings
}

export function warningMessage(warning: CheckInWarning): string {
  switch (warning.kind) {
    case 'duplicate_today':
      return `오늘 이미 ${warning.lastCheckedInTime}에 출석 처리되었습니다.`
    case 'weekly_limit':
      return `이번 주 출석이 ${warning.thisWeekCount}회로, 회원권 기준(주 ${warning.sessionsPerWeek}회)에 도달했습니다.`
    case 'membership_expired':
      return warning.endDate
        ? `회원권이 만료되었습니다 (종료일 ${warning.endDate}).`
        : '회원권이 만료되었습니다.'
    case 'no_membership':
      return '등록된 회원권이 없습니다.'
  }
}
