/**
 * 출석 집계용 기간 계산 (TECH_SPEC 5.1절)
 *
 * `attendances.checked_in_at`은 timestamptz(UTC)로 저장되지만,
 * "오늘"과 "이번 주"는 **한국 시간(KST, UTC+9) 기준**이어야 한다.
 * 예를 들어 한국시간 월요일 오전 8시는 UTC로는 아직 일요일이라,
 * UTC 기준으로 집계하면 주간 횟수가 엉뚱하게 계산된다.
 *
 * 그래서 KST 날짜(YYYY-MM-DD)를 받아 UTC 구간으로 변환해주는 함수를 둔다.
 * 순수 함수라 경계값 단위 테스트가 쉽다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type UtcRange = {
  /** 구간 시작 (포함) */
  startUtc: string
  /** 구간 끝 (미포함) */
  endUtc: string
}

/** KST 날짜 문자열(YYYY-MM-DD)의 자정을 UTC 밀리초로 */
function kstMidnightMs(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day) - KST_OFFSET_MS
}

/** KST 날짜의 요일 (0=일 … 6=토) */
export function kstDayOfWeek(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** 해당 KST 날짜 하루(00:00~24:00 KST)에 해당하는 UTC 구간 */
export function seoulDayRange(isoDate: string): UtcRange {
  const start = kstMidnightMs(isoDate)
  return {
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(start + DAY_MS).toISOString(),
  }
}

/**
 * 해당 KST 날짜가 속한 주(**월요일 시작 ~ 일요일 끝**)의 UTC 구간.
 * 주 시작을 월요일로 잡는 것은 국내 헬스장 운영 관행에 맞춘 것이다.
 */
export function seoulWeekRange(isoDate: string): UtcRange {
  const dow = kstDayOfWeek(isoDate)
  // 일요일(0)은 6일 전이 월요일, 월요일(1)은 0일 전
  const daysSinceMonday = (dow + 6) % 7
  const weekStart = kstMidnightMs(isoDate) - daysSinceMonday * DAY_MS
  return {
    startUtc: new Date(weekStart).toISOString(),
    endUtc: new Date(weekStart + 7 * DAY_MS).toISOString(),
  }
}

/** 해당 주의 월요일 KST 날짜(YYYY-MM-DD) — 화면 표시용 */
export function seoulWeekStartDate(isoDate: string): string {
  const { startUtc } = seoulWeekRange(isoDate)
  return new Date(Date.parse(startUtc) + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** UTC 타임스탬프를 KST 날짜(YYYY-MM-DD)로 */
export function toSeoulDate(utcTimestamp: string): string {
  return new Date(Date.parse(utcTimestamp) + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** UTC 타임스탬프를 KST 시:분으로 (예: "14:05") */
export function toSeoulTime(utcTimestamp: string): string {
  return new Date(Date.parse(utcTimestamp) + KST_OFFSET_MS)
    .toISOString()
    .slice(11, 16)
}
