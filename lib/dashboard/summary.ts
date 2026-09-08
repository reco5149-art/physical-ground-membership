/**
 * 대시보드 집계 (TECH_SPEC 5.3절)
 *
 * DB 조회 결과를 받아 화면에 필요한 형태로 가공하는 **순수 함수**.
 * 화면/DB와 분리해두면 "알고 있는 입력 → 기대하는 숫자"를 단위 테스트로 검산할 수 있다.
 */

import {
  describeMembership,
  pickPrimaryMembership,
  type MembershipStatus,
} from '@/lib/memberships/status'

export type MemberBasic = {
  id: string
  name: string
  phone: string
}

export type MembershipRowForSummary = {
  member_id: string
  plan_name: string | null
  end_date: string | null
  sessions_per_week: number | null
}

export type MemberWithMembership = MemberBasic & {
  planName: string | null
  endDate: string | null
  status: MembershipStatus
  remainingDays: number | null
}

export type DashboardSummary = {
  /** 회원권이 곧 만료되는 회원 (종료일 빠른 순) */
  expiringSoon: MemberWithMembership[]
  /** 회원권이 만료된 회원 (최근에 만료된 순) */
  expired: MemberWithMembership[]
  /** 회원권을 한 번도 등록하지 않은 회원 */
  noMembership: MemberBasic[]
  /** 아직 유효한 회원권을 가진 회원 수 (정상 + 만료임박) */
  validMembershipCount: number
}

export function summarizeMembers(input: {
  members: MemberBasic[]
  memberships: MembershipRowForSummary[]
  today: string
}): DashboardSummary {
  const { members, memberships, today } = input

  // 회원별로 회원권을 묶어둔다
  const byMember = new Map<string, MembershipRowForSummary[]>()
  for (const row of memberships) {
    const list = byMember.get(row.member_id) ?? []
    list.push(row)
    byMember.set(row.member_id, list)
  }

  const expiringSoon: MemberWithMembership[] = []
  const expired: MemberWithMembership[] = []
  const noMembership: MemberBasic[] = []
  let validMembershipCount = 0

  for (const member of members) {
    const primary = pickPrimaryMembership(byMember.get(member.id) ?? [])

    if (!primary) {
      noMembership.push(member)
      continue
    }

    const { status, remainingDays } = describeMembership(primary, today)
    const entry: MemberWithMembership = {
      ...member,
      planName: primary.plan_name,
      endDate: primary.end_date,
      status,
      remainingDays,
    }

    if (status === 'expired') {
      expired.push(entry)
    } else {
      // 정상 · 만료임박 모두 "아직 쓸 수 있는 회원권"
      validMembershipCount += 1
      if (status === 'expiring_soon') expiringSoon.push(entry)
    }
  }

  // 만료임박: 먼저 끝나는 회원부터 (응대 우선순위)
  expiringSoon.sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? ''))
  // 만료: 최근에 만료된 회원부터 (재등록 유도 가능성이 높음)
  expired.sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''))

  return { expiringSoon, expired, noMembership, validMembershipCount }
}
