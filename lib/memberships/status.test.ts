import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  periodStatus,
  describeMembership,
  pickPrimaryMembership,
  daysBetween,
} from './status.ts'
import { calculateEndDate, findPlan, formatPrice, PLANS } from './plans.ts'

describe('periodStatus 경계값', () => {
  const today = '2026-09-08'

  test('종료일이 한참 남으면 정상', () => {
    assert.equal(periodStatus('2026-12-31', today), 'active')
  })

  test('정확히 8일 남으면 아직 정상', () => {
    assert.equal(periodStatus('2026-09-16', today), 'active')
  })

  test('정확히 7일 남으면 만료임박', () => {
    assert.equal(periodStatus('2026-09-15', today), 'expiring_soon')
  })

  test('내일 만료면 만료임박', () => {
    assert.equal(periodStatus('2026-09-09', today), 'expiring_soon')
  })

  test('오늘이 종료일이면 아직 이용 가능 (만료임박)', () => {
    assert.equal(periodStatus('2026-09-08', today), 'expiring_soon')
  })

  test('어제 종료됐으면 만료', () => {
    assert.equal(periodStatus('2026-09-07', today), 'expired')
  })

  test('한참 전에 종료됐으면 만료', () => {
    assert.equal(periodStatus('2025-01-01', today), 'expired')
  })
})

describe('daysBetween', () => {
  test('같은 날은 0', () => {
    assert.equal(daysBetween('2026-09-08', '2026-09-08'), 0)
  })
  test('월 경계를 넘어도 정확', () => {
    assert.equal(daysBetween('2026-08-31', '2026-09-01'), 1)
  })
  test('과거는 음수', () => {
    assert.equal(daysBetween('2026-09-08', '2026-09-01'), -7)
  })
})

describe('describeMembership', () => {
  test('상태와 남은 일수를 함께 돌려준다', () => {
    const result = describeMembership(
      { end_date: '2026-09-15', sessions_per_week: 3 },
      '2026-09-08'
    )
    assert.equal(result.status, 'expiring_soon')
    assert.equal(result.remainingDays, 7)
  })

  test('종료일이 없으면 정상으로 본다', () => {
    const result = describeMembership(
      { end_date: null, sessions_per_week: 3 },
      '2026-09-08'
    )
    assert.equal(result.status, 'active')
    assert.equal(result.remainingDays, null)
  })
})

describe('pickPrimaryMembership', () => {
  test('종료일이 가장 늦은 회원권을 고른다', () => {
    const picked = pickPrimaryMembership([
      { id: 'a', end_date: '2026-09-30' },
      { id: 'b', end_date: '2026-12-31' },
      { id: 'c', end_date: '2026-06-30' },
    ])
    assert.equal(picked?.id, 'b')
  })

  test('회원권이 없으면 null', () => {
    assert.equal(pickPrimaryMembership([]), null)
  })
})

describe('calculateEndDate', () => {
  test('1개월권은 다음 달 같은 날 하루 전까지', () => {
    assert.equal(calculateEndDate('2026-01-15', 1), '2026-02-14')
    assert.equal(calculateEndDate('2026-09-08', 1), '2026-10-07')
  })

  test('3개월권', () => {
    assert.equal(calculateEndDate('2026-01-15', 3), '2026-04-14')
    assert.equal(calculateEndDate('2026-09-08', 3), '2026-12-07')
  })

  test('연도를 넘어가도 정확', () => {
    assert.equal(calculateEndDate('2026-11-20', 3), '2027-02-19')
  })

  test('말일 보정: 1/31 + 1개월은 2월 말일까지 인정', () => {
    assert.equal(calculateEndDate('2026-01-31', 1), '2026-02-28')
  })

  test('윤년 2월 처리', () => {
    assert.equal(calculateEndDate('2028-01-31', 1), '2028-02-29')
  })
})

describe('PLANS 정의', () => {
  test('요금제 4종이 확정 가격과 일치한다', () => {
    assert.equal(PLANS.length, 4)
    assert.equal(findPlan('M1_W3')?.price, 190_000)
    assert.equal(findPlan('M1_W5')?.price, 210_000)
    assert.equal(findPlan('M3_W3')?.price, 530_000)
    assert.equal(findPlan('M3_W5')?.price, 590_000)
  })

  test('주간 횟수와 기간이 코드와 일치한다', () => {
    assert.equal(findPlan('M1_W3')?.sessionsPerWeek, 3)
    assert.equal(findPlan('M3_W5')?.sessionsPerWeek, 5)
    assert.equal(findPlan('M1_W5')?.durationMonths, 1)
    assert.equal(findPlan('M3_W3')?.durationMonths, 3)
  })

  test('없는 코드는 undefined (위조된 요금제 코드 방어)', () => {
    assert.equal(findPlan('FAKE_PLAN'), undefined)
    assert.equal(findPlan(''), undefined)
  })

  test('가격 표기', () => {
    assert.equal(formatPrice(190_000), '190,000원')
  })
})
