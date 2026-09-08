import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  kstDayOfWeek,
  seoulDayRange,
  seoulWeekRange,
  seoulWeekStartDate,
  toSeoulDate,
  toSeoulTime,
} from './week.ts'
import { evaluateCheckIn, warningMessage } from './warnings.ts'

describe('seoulDayRange', () => {
  test('KST 하루는 UTC로 전날 15:00부터 당일 15:00까지', () => {
    // 한국시간 2026-09-08 00:00 = UTC 2026-09-07 15:00
    const range = seoulDayRange('2026-09-08')
    assert.equal(range.startUtc, '2026-09-07T15:00:00.000Z')
    assert.equal(range.endUtc, '2026-09-08T15:00:00.000Z')
  })

  test('월 경계에서도 정확', () => {
    const range = seoulDayRange('2026-10-01')
    assert.equal(range.startUtc, '2026-09-30T15:00:00.000Z')
  })
})

describe('kstDayOfWeek', () => {
  test('2026-09-08은 화요일(2)', () => {
    assert.equal(kstDayOfWeek('2026-09-08'), 2)
  })
  test('2026-09-07은 월요일(1)', () => {
    assert.equal(kstDayOfWeek('2026-09-07'), 1)
  })
  test('2026-09-13은 일요일(0)', () => {
    assert.equal(kstDayOfWeek('2026-09-13'), 0)
  })
})

describe('seoulWeekRange — 월요일 시작 주', () => {
  test('화요일에 조회하면 그 주 월요일부터', () => {
    // 2026-09-08(화) → 주 시작 2026-09-07(월) KST 00:00 = UTC 09-06 15:00
    const range = seoulWeekRange('2026-09-08')
    assert.equal(range.startUtc, '2026-09-06T15:00:00.000Z')
    assert.equal(range.endUtc, '2026-09-13T15:00:00.000Z')
  })

  test('월요일 당일에 조회하면 그날이 주 시작', () => {
    const range = seoulWeekRange('2026-09-07')
    assert.equal(range.startUtc, '2026-09-06T15:00:00.000Z')
  })

  test('일요일은 이전 월요일이 주 시작 (다음 주로 넘어가지 않음)', () => {
    // 2026-09-13(일) → 주 시작은 2026-09-07(월)
    const range = seoulWeekRange('2026-09-13')
    assert.equal(range.startUtc, '2026-09-06T15:00:00.000Z')
    assert.equal(range.endUtc, '2026-09-13T15:00:00.000Z')
  })

  test('일요일 다음날(월)은 새 주가 시작된다', () => {
    const sunday = seoulWeekRange('2026-09-13')
    const monday = seoulWeekRange('2026-09-14')
    assert.notEqual(sunday.startUtc, monday.startUtc)
    assert.equal(monday.startUtc, '2026-09-13T15:00:00.000Z')
  })

  test('주 구간은 정확히 7일', () => {
    const range = seoulWeekRange('2026-09-10')
    const days = (Date.parse(range.endUtc) - Date.parse(range.startUtc)) / 86_400_000
    assert.equal(days, 7)
  })

  test('연말 경계에서도 정확', () => {
    // 2027-01-01은 금요일 → 주 시작은 2026-12-28(월)
    assert.equal(seoulWeekStartDate('2027-01-01'), '2026-12-28')
  })
})

describe('toSeoulDate / toSeoulTime', () => {
  test('UTC 일요일 늦은 시간은 KST 월요일로 해석된다', () => {
    // UTC 2026-09-06 16:00 = KST 2026-09-07 01:00 (월요일)
    assert.equal(toSeoulDate('2026-09-06T16:00:00.000Z'), '2026-09-07')
    assert.equal(toSeoulTime('2026-09-06T16:00:00.000Z'), '01:00')
  })

  test('오후 시간 변환', () => {
    // UTC 2026-09-08 05:05 = KST 14:05
    assert.equal(toSeoulTime('2026-09-08T05:05:00.000Z'), '14:05')
  })
})

describe('evaluateCheckIn — 경고 판정', () => {
  const activeMembership = {
    status: 'active' as const,
    endDate: '2026-12-07',
    sessionsPerWeek: 3,
  }

  test('정상 회원권 + 첫 출석이면 경고 없음', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 0,
      membership: activeMembership,
    })
    assert.equal(warnings.length, 0)
  })

  test('주간 한도 미달이면 경고 없음 (2/3회)', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 2,
      membership: activeMembership,
    })
    assert.equal(warnings.length, 0)
  })

  test('주간 한도에 도달하면 경고 (3/3회)', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 3,
      membership: activeMembership,
    })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].kind, 'weekly_limit')
  })

  test('주간 한도를 넘어도 경고만 (차단 아님)', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 5,
      membership: activeMembership,
    })
    assert.equal(warnings.some((w) => w.kind === 'weekly_limit'), true)
  })

  test('당일 중복 체크인 경고', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: '10:30',
      thisWeekCount: 1,
      membership: activeMembership,
    })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].kind, 'duplicate_today')
  })

  test('만료된 회원권 경고', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 0,
      membership: { status: 'expired', endDate: '2026-09-04', sessionsPerWeek: 3 },
    })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].kind, 'membership_expired')
  })

  test('회원권이 없으면 경고', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 0,
      membership: null,
    })
    assert.equal(warnings.length, 1)
    assert.equal(warnings[0].kind, 'no_membership')
  })

  test('여러 문제가 겹치면 경고도 여러 개', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: '09:00',
      thisWeekCount: 4,
      membership: { status: 'expired', endDate: '2026-09-01', sessionsPerWeek: 3 },
    })
    assert.equal(warnings.length, 3)
  })

  test('만료임박은 경고 대상이 아니다 (아직 이용 가능)', () => {
    const warnings = evaluateCheckIn({
      todayCheckedInTime: null,
      thisWeekCount: 0,
      membership: { status: 'expiring_soon', endDate: '2026-09-10', sessionsPerWeek: 5 },
    })
    assert.equal(warnings.length, 0)
  })

  test('경고 메시지가 사람이 읽을 수 있는 문장이다', () => {
    assert.match(
      warningMessage({ kind: 'weekly_limit', thisWeekCount: 3, sessionsPerWeek: 3 }),
      /주 3회/
    )
    assert.match(
      warningMessage({ kind: 'duplicate_today', lastCheckedInTime: '10:30' }),
      /10:30/
    )
  })
})
