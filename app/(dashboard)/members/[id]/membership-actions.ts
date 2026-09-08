'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calculateEndDate, findPlan } from '@/lib/memberships/plans'
import { todayInSeoul } from '@/lib/memberships/status'

export type MembershipFormState = {
  error?: string
}

/**
 * 회원권 등록.
 *
 * 요금제는 화면에서 고른 코드만 받고, **이름·가격·기간은 서버의 상수표에서 다시 읽는다.**
 * 클라이언트가 보낸 가격을 그대로 믿으면 폼을 조작해 임의 금액으로 등록할 수 있기 때문이다.
 */
export async function createMembership(
  memberId: string,
  _prevState: MembershipFormState,
  formData: FormData
): Promise<MembershipFormState> {
  const planCode = String(formData.get('plan_code') ?? '')
  const startDate = String(formData.get('start_date') ?? '').trim()

  const plan = findPlan(planCode)
  if (!plan) return { error: '요금제를 선택해주세요.' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { error: '시작일을 올바르게 입력해주세요.' }
  }
  const parsed = new Date(`${startDate}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== startDate) {
    return { error: '존재하지 않는 날짜입니다.' }
  }

  const endDate = calculateEndDate(startDate, plan.durationMonths)

  const supabase = await createClient()

  // 대상 회원이 실제로 있는지 확인 (URL의 id를 조작한 요청 방어)
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('id', memberId)
    .maybeSingle()
  if (!member) return { error: '회원을 찾을 수 없습니다.' }

  const { error } = await supabase.from('memberships').insert({
    member_id: memberId,
    type: 'period',
    start_date: startDate,
    end_date: endDate,
    plan_code: plan.code,
    plan_name: plan.name,
    price: plan.price,
    sessions_per_week: plan.sessionsPerWeek,
  })

  if (error) {
    console.error('[createMembership]', error.code, error.message)
    return { error: '회원권 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
  return {}
}

export async function deleteMembership(memberId: string, membershipId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('memberships').delete().eq('id', membershipId)

  if (error) {
    console.error('[deleteMembership]', error.code, error.message)
  }

  revalidatePath(`/members/${memberId}`)
  revalidatePath('/members')
}

/** 폼 기본값으로 쓸 오늘 날짜 (한국 시간) */
export async function getToday(): Promise<string> {
  return todayInSeoul()
}
