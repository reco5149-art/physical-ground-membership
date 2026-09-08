import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { todayInSeoul } from '@/lib/memberships/status'
import { seoulDayRange } from '@/lib/attendance/week'
import {
  summarizeMembers,
  type MemberBasic,
  type MembershipRowForSummary,
} from '@/lib/dashboard/summary'

/**
 * 대시보드(홈) — TECH_SPEC 5.3절.
 *
 * 오늘 출석 수, 유효 회원권 보유 수, 그리고 응대가 필요한 회원 목록
 * (만료임박 / 만료 / 회원권 없음)을 한눈에 보여준다.
 *
 * 집계 로직은 순수 함수(lib/dashboard/summary.ts)로 분리해 단위 테스트로 검산한다.
 * 이 페이지는 DB에서 값을 읽어와 그 함수에 넘기고 결과를 그리는 역할만 한다.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayInSeoul()

  // 오늘 출석 수: checked_in_at은 UTC라, KST "오늘"에 해당하는 UTC 구간으로 세야 한다.
  const { startUtc, endUtc } = seoulDayRange(today)
  const { count: todayAttendance } = await supabase
    .from('attendances')
    .select('id', { count: 'exact', head: true })
    .gte('checked_in_at', startUtc)
    .lt('checked_in_at', endUtc)

  // 활성 회원 수 (권위 있는 카운트)
  const { count: activeCount } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  // 응대 목록 집계용: 활성 회원 + 회원권을 가져와 순수 함수로 분류한다.
  const { data: memberRows } = await supabase
    .from('members')
    .select('id, name, phone')
    .eq('status', 'active')
    .limit(1000)

  const members = (memberRows ?? []) as MemberBasic[]

  const membershipsByMember: MembershipRowForSummary[] = []
  if (members.length > 0) {
    const { data: membershipRows } = await supabase
      .from('memberships')
      .select('member_id, plan_name, end_date, sessions_per_week')
      .in(
        'member_id',
        members.map((m) => m.id)
      )
    for (const row of membershipRows ?? []) {
      membershipsByMember.push(row as MembershipRowForSummary)
    }
  }

  const { expiringSoon, expired, noMembership, validMembershipCount } =
    summarizeMembers({ members, memberships: membershipsByMember, today })

  return (
    <main>
      <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
      <p className="mt-1 text-sm text-gray-500">
        {user?.email} 님으로 로그인되어 있습니다.
      </p>

      {/* 요약 지표 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">오늘 출석</p>
          <p data-testid="today-attendance-count" className="mt-1 text-2xl font-bold text-gray-900">
            {todayAttendance ?? 0}명
          </p>
          <Link href="/attendance" className="mt-2 block text-xs text-gray-400 hover:text-gray-600">
            출석 체크로 이동 →
          </Link>
        </div>

        <Link
          href="/members"
          className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-400"
        >
          <p className="text-sm text-gray-500">활성 회원</p>
          <p data-testid="active-member-count" className="mt-1 text-2xl font-bold text-gray-900">
            {activeCount ?? 0}명
          </p>
          <p className="mt-2 text-xs text-gray-400">회원 관리로 이동 →</p>
        </Link>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">유효 회원권 보유</p>
          <p data-testid="valid-membership-count" className="mt-1 text-2xl font-bold text-gray-900">
            {validMembershipCount}명
          </p>
          <p className="mt-2 text-xs text-gray-400">정상 · 만료임박 합계</p>
        </div>
      </div>

      {/* 응대가 필요한 회원 목록 */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <MemberListCard
          testId="expiring-soon-list"
          title="회원권 만료임박"
          accent="text-amber-800"
          emptyText="만료임박 회원이 없습니다."
          items={expiringSoon.map((m) => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            note:
              m.remainingDays === 0
                ? '오늘 만료'
                : `${m.remainingDays}일 남음`,
            noteClass: 'text-amber-700',
          }))}
        />

        <MemberListCard
          testId="expired-list"
          title="회원권 만료"
          accent="text-gray-500"
          emptyText="만료된 회원이 없습니다."
          items={expired.map((m) => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            note: m.endDate ? `${m.endDate} 만료` : '만료',
            noteClass: 'text-gray-400',
          }))}
        />

        <MemberListCard
          testId="no-membership-list"
          title="회원권 없음"
          accent="text-gray-700"
          emptyText="회원권 없는 활성 회원이 없습니다."
          items={noMembership.map((m) => ({
            id: m.id,
            name: m.name,
            phone: m.phone,
            note: '등록 필요',
            noteClass: 'text-gray-400',
          }))}
        />
      </div>
    </main>
  )
}

type ListItem = {
  id: string
  name: string
  phone: string
  note: string
  noteClass: string
}

/** 응대 목록 카드 하나 (만료임박 / 만료 / 회원권 없음 공용) */
function MemberListCard({
  title,
  accent,
  emptyText,
  items,
  testId,
}: {
  title: string
  accent: string
  emptyText: string
  items: ListItem[]
  testId: string
}) {
  return (
    <section
      data-testid={testId}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className={`text-sm font-semibold ${accent}`}>{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {items.length}명
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-gray-400">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/members/${item.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-gray-50"
              >
                <span className="min-w-0">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{item.phone}</span>
                </span>
                <span className={`shrink-0 text-xs ${item.noteClass}`}>{item.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
