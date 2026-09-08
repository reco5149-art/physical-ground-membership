/**
 * 피지컬그라운드 요금제 (2026-09 기준)
 *
 * 요금제는 자주 바뀌지 않으므로 코드 상수로 관리한다. (TECH_SPEC 4.3절)
 * 판매 시점의 이름/가격은 memberships 행에 스냅샷으로 함께 저장되므로,
 * 나중에 이 표의 가격을 바꿔도 과거 기록은 영향을 받지 않는다.
 */

export type PlanCode = 'M1_W3' | 'M1_W5' | 'M3_W3' | 'M3_W5'

export type Plan = {
  code: PlanCode
  name: string
  durationMonths: number
  sessionsPerWeek: number
  price: number
}

export const PLANS: readonly Plan[] = [
  { code: 'M1_W3', name: '1개월 주3회', durationMonths: 1, sessionsPerWeek: 3, price: 190_000 },
  { code: 'M1_W5', name: '1개월 주5회', durationMonths: 1, sessionsPerWeek: 5, price: 210_000 },
  { code: 'M3_W3', name: '3개월 주3회', durationMonths: 3, sessionsPerWeek: 3, price: 530_000 },
  { code: 'M3_W5', name: '3개월 주5회', durationMonths: 3, sessionsPerWeek: 5, price: 590_000 },
] as const

export function findPlan(code: string): Plan | undefined {
  return PLANS.find((plan) => plan.code === code)
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`
}

/**
 * 시작일 + 개월 수 → 종료일(포함) 계산.
 *
 * 예) 2026-01-15 + 1개월 → 2026-02-14 (다음 달 같은 날의 하루 전)
 * 말일 보정: 1/31 + 1개월 → 2/28 (2월에 31일이 없으므로 말일로 맞춘 뒤 하루 전 = 2/27이 아니라
 * "2월 말일"까지 인정) — 회원에게 불리하지 않도록 해당 월의 말일을 종료일로 삼는다.
 */
export function calculateEndDate(startDate: string, durationMonths: number): string {
  const [year, month, day] = startDate.split('-').map(Number)

  // 시작일로부터 durationMonths 뒤의 같은 날짜
  const targetMonthIndex = month - 1 + durationMonths
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = (targetMonthIndex % 12) + 1

  // 대상 월의 말일 (예: 2월이면 28 또는 29)
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()

  if (day > lastDayOfTargetMonth) {
    // 시작일이 대상 월에 없는 날짜(1/31 → 2월)면 그 달의 말일까지 인정한다
    return toDateString(targetYear, targetMonth, lastDayOfTargetMonth)
  }

  // 일반적인 경우: 같은 날짜의 하루 전날이 종료일
  const end = new Date(Date.UTC(targetYear, targetMonth - 1, day))
  end.setUTCDate(end.getUTCDate() - 1)
  return end.toISOString().slice(0, 10)
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
