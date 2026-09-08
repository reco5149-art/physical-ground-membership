'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { validateMemberInput } from '@/lib/members/validation'

export type MemberFormState = {
  error?: string
}

function formToObject(formData: FormData) {
  return {
    name: formData.get('name'),
    phone: formData.get('phone'),
    birth_date: formData.get('birth_date'),
    gender: formData.get('gender'),
    memo: formData.get('memo'),
  }
}

/**
 * 같은 연락처를 쓰는 활성 회원이 이미 있는지 확인한다.
 *
 * 연락처는 출석 체크 시 회원을 찾는 핵심 키라, 중복되면 누구를 체크인하는지
 * 모호해진다. 그래서 MVP에서는 활성 회원 간 연락처 중복을 막는다.
 * (비활성 회원과는 중복되어도 허용 — 재등록 회원 처리를 막지 않기 위함)
 */
async function findActiveMemberByPhone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  phone: string,
  excludeId?: string
) {
  let query = supabase
    .from('members')
    .select('id, name')
    .eq('phone', phone)
    .eq('status', 'active')
    .limit(1)

  if (excludeId) query = query.neq('id', excludeId)

  const { data } = await query
  return data?.[0] ?? null
}

export async function createMember(
  _prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const result = validateMemberInput(formToObject(formData))
  if (!result.ok) return { error: result.error }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const duplicate = await findActiveMemberByPhone(supabase, result.value.phone)
  if (duplicate) {
    return {
      error: `같은 연락처의 회원(${duplicate.name})이 이미 등록되어 있습니다.`,
    }
  }

  const { data, error } = await supabase
    .from('members')
    .insert({ ...result.value, created_by: user?.id ?? null })
    .select('id')
    .single()

  if (error) {
    console.error('[createMember]', error.code, error.message)
    return { error: '회원 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath('/members')
  redirect(`/members/${data.id}`)
}

export async function updateMember(
  memberId: string,
  _prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const result = validateMemberInput(formToObject(formData))
  if (!result.ok) return { error: result.error }

  const supabase = await createClient()

  const duplicate = await findActiveMemberByPhone(
    supabase,
    result.value.phone,
    memberId
  )
  if (duplicate) {
    return {
      error: `같은 연락처의 회원(${duplicate.name})이 이미 등록되어 있습니다.`,
    }
  }

  const { error } = await supabase
    .from('members')
    .update(result.value)
    .eq('id', memberId)

  if (error) {
    console.error('[updateMember]', error.code, error.message)
    return { error: '회원 정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath('/members')
  revalidatePath(`/members/${memberId}`)
  redirect(`/members/${memberId}`)
}

/**
 * 회원 비활성화 / 재활성화.
 *
 * PRD 4.1절에 따라 회원 "삭제"는 하드 삭제가 아니라 상태 변경으로 처리한다.
 * 출석 이력 등 과거 기록을 보존해야 하기 때문이다.
 */
export async function setMemberStatus(memberId: string, status: 'active' | 'inactive') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('members')
    .update({ status })
    .eq('id', memberId)

  if (error) {
    console.error('[setMemberStatus]', error.code, error.message)
  }

  revalidatePath('/members')
  revalidatePath(`/members/${memberId}`)
}
