import type { MemberInput } from './types'

/**
 * 회원 입력값 검증.
 *
 * 브라우저 검증은 우회될 수 있으므로 이 함수는 반드시 서버(Server Action)에서 호출한다.
 * 순수 함수로 분리해 단위 테스트가 가능하도록 했다.
 */

export const LIMITS = {
  name: 50,
  memo: 1000,
  phoneDigitsMin: 9,
  phoneDigitsMax: 11,
} as const

export type ValidationResult =
  | { ok: true; value: MemberInput }
  | { ok: false; error: string }

/** 숫자만 남긴 뒤 010-1234-5678 형태로 정규화한다. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (
    digits.length < LIMITS.phoneDigitsMin ||
    digits.length > LIMITS.phoneDigitsMax
  ) {
    return null
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    // 지역번호 02 (서울) 는 앞자리가 2자리
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  // 9자리 (예: 02-123-4567)
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return false
  // 입력값과 파싱 결과가 일치하는지 확인 (2026-02-31 같은 값 걸러내기)
  return date.toISOString().slice(0, 10) === value
}

export function validateMemberInput(form: {
  name?: unknown
  phone?: unknown
  birth_date?: unknown
  gender?: unknown
  memo?: unknown
}): ValidationResult {
  const name = String(form.name ?? '').trim()
  const phoneRaw = String(form.phone ?? '').trim()
  const birthRaw = String(form.birth_date ?? '').trim()
  const genderRaw = String(form.gender ?? '').trim()
  const memoRaw = String(form.memo ?? '').trim()

  if (!name) return { ok: false, error: '이름을 입력해주세요.' }
  if (name.length > LIMITS.name) {
    return { ok: false, error: `이름은 ${LIMITS.name}자 이내로 입력해주세요.` }
  }

  if (!phoneRaw) return { ok: false, error: '연락처를 입력해주세요.' }
  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return {
      ok: false,
      error: '연락처 형식이 올바르지 않습니다. 숫자 9~11자리로 입력해주세요.',
    }
  }

  if (birthRaw && !isValidDate(birthRaw)) {
    return { ok: false, error: '생년월일 형식이 올바르지 않습니다.' }
  }
  if (birthRaw) {
    const today = new Date().toISOString().slice(0, 10)
    if (birthRaw > today) {
      return { ok: false, error: '생년월일은 오늘 이후일 수 없습니다.' }
    }
  }

  if (genderRaw && genderRaw !== 'male' && genderRaw !== 'female') {
    return { ok: false, error: '성별 값이 올바르지 않습니다.' }
  }

  if (memoRaw.length > LIMITS.memo) {
    return { ok: false, error: `메모는 ${LIMITS.memo}자 이내로 입력해주세요.` }
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      birth_date: birthRaw || null,
      gender: genderRaw || null,
      memo: memoRaw || null,
    },
  }
}
