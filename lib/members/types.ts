/** members 테이블 한 행 (TECH_SPEC 4.2절과 동일) */
export type Member = {
  id: string
  name: string
  phone: string
  birth_date: string | null
  gender: string | null
  memo: string | null
  status: 'active' | 'inactive'
  created_by: string | null
  created_at: string
}

/** 회원 등록/수정 폼이 다루는 입력값 */
export type MemberInput = {
  name: string
  phone: string
  birth_date: string | null
  gender: string | null
  memo: string | null
}

export const GENDER_OPTIONS = [
  { value: '', label: '선택 안 함' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
] as const

export function genderLabel(gender: string | null): string {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '-'
}
