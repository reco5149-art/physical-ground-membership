'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { describeMembership, pickPrimaryMembership, todayInSeoul } from '@/lib/memberships/status'
import { seoulDayRange, seoulWeekRange, toSeoulTime } from '@/lib/attendance/week'
import { evaluateCheckIn, type CheckInWarning } from '@/lib/attendance/warnings'

export type CheckInResult = {
  /** 실제로 출석이 기록되었는지 */
  checkedIn: boolean
  /** 사용자에게 보여줄 경고들 (재확인 필요) */
  warnings?: CheckInWarning[]
  memberName?: string
  error?: string
}

type MembershipRow = {
  id: string
  end_date: string | null
  sessions_per_week: number | null
}

/**
 * 출석 체크인.
 *
 * 정책(TECH_SPEC 5.1): 당일 중복·주간 횟수 초과·회원권 만료는 **차단하지 않고 경고**한다.
 * 첫 호출에서 경고가 있으면 기록하지 않고 경고만 돌려주고,
 * 직원이 확인한 뒤 `confirmed: true`로 다시 호출하면 그때 기록한다.
 */
export async function checkIn(
  memberId: string,
  confirmed: boolean
): Promise<CheckInResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // URL/폼의 id를 조작한 요청 방어 — 실제 존재하는 회원인지 확인
  const { data: member } = await supabase
    .from('members')
    .select('id, name, status')
    .eq('id', memberId)
    .maybeSingle()

  if (!member) return { checkedIn: false, error: '회원을 찾을 수 없습니다.' }

  const today = todayInSeoul()
  const dayRange = seoulDayRange(today)
  const weekRange = seoulWeekRange(today)

  // 오늘 출석 기록 (중복 확인용)
  const { data: todayRows } = await supabase
    .from('attendances')
    .select('checked_in_at')
    .eq('member_id', memberId)
    .gte('checked_in_at', dayRange.startUtc)
    .lt('checked_in_at', dayRange.endUtc)
    .order('checked_in_at', { ascending: true })
    .limit(1)

  // 이번 주 출석 횟수 (이번 체크인은 아직 포함되지 않은 값)
  const { count: weekCount } = await supabase
    .from('attendances')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .gte('checked_in_at', weekRange.startUtc)
    .lt('checked_in_at', weekRange.endUtc)

  // 대표 회원권
  const { data: membershipRows } = await supabase
    .from('memberships')
    .select('id, end_date, sessions_per_week')
    .eq('member_id', memberId)

  const primary = pickPrimaryMembership((membershipRows ?? []) as MembershipRow[])
  const described = primary ? describeMembership(primary, today) : null

  const warnings = evaluateCheckIn({
    todayCheckedInTime: todayRows?.[0]
      ? toSeoulTime(todayRows[0].checked_in_at)
      : null,
    thisWeekCount: weekCount ?? 0,
    membership:
      primary && described
        ? {
            status: described.status,
            endDate: primary.end_date,
            sessionsPerWeek: primary.sessions_per_week,
          }
        : null,
  })

  // 경고가 있는데 아직 확인 전이면 기록하지 않고 되돌려준다
  if (warnings.length > 0 && !confirmed) {
    return { checkedIn: false, warnings, memberName: member.name }
  }

  const { error } = await supabase.from('attendances').insert({
    member_id: memberId,
    // 만료된 회원권이라도 어떤 회원권으로 왔는지 기록해 두는 편이 추적에 유리하다
    membership_id: primary?.id ?? null,
    checked_in_by: user?.id ?? null,
  })

  if (error) {
    console.error('[checkIn]', error.code, error.message)
    return { checkedIn: false, error: '출석 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath('/attendance')
  revalidatePath(`/members/${memberId}`)
  revalidatePath('/')

  return { checkedIn: true, memberName: member.name }
}

/** 잘못 누른 출석 기록 취소 */
export async function cancelAttendance(attendanceId: string, memberId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('attendances').delete().eq('id', attendanceId)

  if (error) {
    console.error('[cancelAttendance]', error.code, error.message)
  }

  revalidatePath('/attendance')
  revalidatePath(`/members/${memberId}`)
  revalidatePath('/')
}
