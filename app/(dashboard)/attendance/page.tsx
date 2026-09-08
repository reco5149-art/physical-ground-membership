import { createClient } from '@/lib/supabase/server'
import {
  STATUS_LABEL,
  describeMembership,
  pickPrimaryMembership,
  todayInSeoul,
  type MembershipStatus,
} from '@/lib/memberships/status'
import { seoulDayRange, seoulWeekRange, seoulWeekStartDate, toSeoulTime } from '@/lib/attendance/week'
import { CheckInPanel, type CheckInCandidate } from './check-in-panel'
import { TodayAttendanceList } from './today-list'

/** PostgREST `or` 필터 구문이 깨지지 않도록 구분자로 쓰이는 문자를 제거한다. */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()*\\]/g, '').trim()
}

const BADGE: Record<MembershipStatus, string> = {
  active: 'bg-green-50 text-green-700',
  expiring_soon: 'bg-amber-50 text-amber-800',
  expired: 'bg-gray-100 text-gray-500',
}

export default async function AttendancePage({
  searchParams,
}: PageProps<'/attendance'>) {
  const params = await searchParams
  const rawQuery = typeof params.q === 'string' ? params.q : ''
  const query = sanitizeSearch(rawQuery).slice(0, 50)

  const supabase = await createClient()
  const today = todayInSeoul()
  const dayRange = seoulDayRange(today)
  const weekRange = seoulWeekRange(today)

  // --- 검색 결과 (체크인 대상) ---
  let candidates: CheckInCandidate[] = []

  if (query) {
    const { data: members } = await supabase
      .from('members')
      .select('id, name, phone')
      .eq('status', 'active')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('name')
      .limit(20)

    const memberIds = (members ?? []).map((m) => m.id)

    if (memberIds.length > 0) {
      const [{ data: membershipRows }, { data: weekRows }] = await Promise.all([
        supabase
          .from('memberships')
          .select('member_id, plan_name, end_date, sessions_per_week')
          .in('member_id', memberIds),
        supabase
          .from('attendances')
          .select('member_id, checked_in_at')
          .in('member_id', memberIds)
          .gte('checked_in_at', weekRange.startUtc)
          .lt('checked_in_at', weekRange.endUtc),
      ])

      candidates = (members ?? []).map((member) => {
        const memberships = (membershipRows ?? []).filter(
          (row) => row.member_id === member.id
        )
        const primary = pickPrimaryMembership(memberships)
        const described = primary ? describeMembership(primary, today) : null

        const weekAttendances = (weekRows ?? []).filter(
          (row) => row.member_id === member.id
        )
        const todayAttendance = weekAttendances.find(
          (row) =>
            row.checked_in_at >= dayRange.startUtc &&
            row.checked_in_at < dayRange.endUtc
        )

        return {
          id: member.id,
          name: member.name,
          phone: member.phone,
          planName: primary?.plan_name ?? null,
          membershipStatus: described?.status ?? null,
          endDate: primary?.end_date ?? null,
          sessionsPerWeek: primary?.sessions_per_week ?? null,
          thisWeekCount: weekAttendances.length,
          todayCheckedInTime: todayAttendance
            ? toSeoulTime(todayAttendance.checked_in_at)
            : null,
        }
      })
    }
  }

  // --- 오늘 출석 목록 ---
  const { data: todayRows } = await supabase
    .from('attendances')
    .select('id, member_id, checked_in_at, members(name, phone)')
    .gte('checked_in_at', dayRange.startUtc)
    .lt('checked_in_at', dayRange.endUtc)
    .order('checked_in_at', { ascending: false })

  const todayList = (todayRows ?? []).map((row) => {
    const member = row.members as unknown as { name: string; phone: string } | null
    return {
      id: row.id,
      memberId: row.member_id,
      name: member?.name ?? '(삭제된 회원)',
      phone: member?.phone ?? '-',
      time: toSeoulTime(row.checked_in_at),
    }
  })

  return (
    <main>
      <h1 className="text-xl font-bold text-gray-900">출석 체크</h1>
      <p className="mt-1 text-sm text-gray-500">
        오늘 {today} · 이번 주 시작 {seoulWeekStartDate(today)}(월)
      </p>

      <form className="mt-6 flex gap-2" action="/attendance" method="get">
        <input
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder="이름 또는 연락처로 회원 검색"
          maxLength={50}
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          검색
        </button>
      </form>

      {query && candidates.length === 0 && (
        <p
          data-testid="no-candidates"
          className="mt-6 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500"
        >
          &lsquo;{rawQuery}&rsquo; 검색 결과가 없습니다.
        </p>
      )}

      {candidates.length > 0 && (
        <ul data-testid="candidates" className="mt-6 space-y-2">
          {candidates.map((candidate) => (
            <CheckInPanel
              key={candidate.id}
              candidate={candidate}
              statusClassName={
                candidate.membershipStatus ? BADGE[candidate.membershipStatus] : ''
              }
              statusLabel={
                candidate.membershipStatus
                  ? STATUS_LABEL[candidate.membershipStatus]
                  : null
              }
            />
          ))}
        </ul>
      )}

      <TodayAttendanceList items={todayList} />
    </main>
  )
}
