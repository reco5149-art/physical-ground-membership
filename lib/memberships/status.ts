/**
 * 회원권 상태 판정 (TECH_SPEC 5.2절)
 *
 * 화면·DB와 분리된 순수 함수라 경계값 단위 테스트가 쉽다.
 */

export type MembershipStatus = 'active' | 'expiring_soon' | 'expired'

/** 만료임박으로 볼 잔여 일수 기준 */
export const EXPIRING_SOON_DAYS = 7

export const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: '정상',
  expiring_soon: '만료임박',
  expired: '만료',
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수 차이 (b - a) */
export function daysBetween(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`)
  const end = Date.parse(`${b}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

/**
 * 기간제 회원권 상태.
 *
 * - 종료일이 오늘보다 이전  → 만료
 * - 남은 일수가 7일 이하    → 만료임박
 * - 그 외                   → 정상
 *
 * 종료일 당일은 아직 이용할 수 있으므로 '만료'가 아니다.
 */
export function periodStatus(endDate: string, today: string): MembershipStatus {
  const remaining = daysBetween(today, endDate)
  if (remaining < 0) return 'expired'
  if (remaining <= EXPIRING_SOON_DAYS) return 'expiring_soon'
  return 'active'
}

export type MembershipLike = {
  end_date: string | null
  sessions_per_week: number | null
}

/** 회원권 한 건의 상태와 남은 일수를 함께 계산한다. */
export function describeMembership(
  membership: MembershipLike,
  today: string
): { status: MembershipStatus; remainingDays: number | null } {
  if (!membership.end_date) {
    return { status: 'active', remainingDays: null }
  }
  return {
    status: periodStatus(membership.end_date, today),
    remainingDays: daysBetween(today, membership.end_date),
  }
}

/**
 * 회원이 여러 회원권을 가진 경우 대표가 되는 것을 고른다.
 * = 종료일이 가장 늦은 회원권 (갱신하면 새 회원권이 대표가 된다)
 */
export function pickPrimaryMembership<T extends { end_date: string | null }>(
  memberships: T[]
): T | null {
  if (memberships.length === 0) return null
  return memberships.reduce((best, current) => {
    if (!best.end_date) return current
    if (!current.end_date) return best
    return current.end_date > best.end_date ? current : best
  })
}

/** 오늘 날짜를 한국 시간 기준 YYYY-MM-DD 로 반환 */
export function todayInSeoul(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
}
