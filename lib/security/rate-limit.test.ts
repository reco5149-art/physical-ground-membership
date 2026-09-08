import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateRateLimit,
  hitRateLimit,
  _resetRateLimitStore,
} from './rate-limit.ts'

const opts = { limit: 3, windowMs: 60_000 }

describe('evaluateRateLimit — 순수 판정', () => {
  test('기록이 없으면 허용하고 이번 요청을 남긴다', () => {
    const r = evaluateRateLimit([], 1_000, opts)
    assert.equal(r.allowed, true)
    assert.deepEqual(r.kept, [1_000])
    assert.equal(r.remaining, 2)
  })

  test('한도 직전(2/3)까지는 허용', () => {
    const r = evaluateRateLimit([1_000, 2_000], 3_000, opts)
    assert.equal(r.allowed, true)
    assert.equal(r.remaining, 0)
    assert.deepEqual(r.kept, [1_000, 2_000, 3_000])
  })

  test('한도 도달(3/3)이면 차단하고 이번 요청은 남기지 않는다', () => {
    const r = evaluateRateLimit([1_000, 2_000, 3_000], 4_000, opts)
    assert.equal(r.allowed, false)
    assert.equal(r.remaining, 0)
    assert.deepEqual(r.kept, [1_000, 2_000, 3_000]) // 그대로
  })

  test('윈도를 벗어난 오래된 기록은 카운트에서 빠진다', () => {
    // 첫 기록(1_000)은 now(62_000) 기준 windowMs(60_000) 밖 → 만료
    const r = evaluateRateLimit([1_000, 30_000, 50_000], 62_000, opts)
    assert.equal(r.allowed, true)
    assert.deepEqual(r.kept, [30_000, 50_000, 62_000])
  })

  test('차단 시 retryAfterMs = 가장 오래된 기록이 윈도를 벗어나는 시점까지', () => {
    // 가장 오래된 기록 10_000 → 10_000+60_000=70_000에 자리 생김. now=65_000 → 5_000ms
    const r = evaluateRateLimit([10_000, 20_000, 30_000], 65_000, opts)
    assert.equal(r.allowed, false)
    assert.equal(r.retryAfterMs, 5_000)
  })

  test('경계: 정확히 windowMs 지난 기록은 만료로 본다 (t > cutoff)', () => {
    // cutoff = 61_000 - 60_000 = 1_000. t=1_000 은 > 1_000 이 아니므로 제외
    const r = evaluateRateLimit([1_000], 61_000, opts)
    assert.deepEqual(r.kept, [61_000])
  })
})

describe('hitRateLimit — 인메모리 스토어', () => {
  beforeEach(() => _resetRateLimitStore())

  test('한도까지 허용 후 차단된다', () => {
    assert.equal(hitRateLimit('login:ip', opts, 1_000).allowed, true)
    assert.equal(hitRateLimit('login:ip', opts, 1_100).allowed, true)
    assert.equal(hitRateLimit('login:ip', opts, 1_200).allowed, true)
    const blocked = hitRateLimit('login:ip', opts, 1_300)
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfterMs > 0)
  })

  test('키(IP)가 다르면 카운트가 서로 섞이지 않는다', () => {
    hitRateLimit('login:a', opts, 1_000)
    hitRateLimit('login:a', opts, 1_100)
    hitRateLimit('login:a', opts, 1_200)
    // a는 소진됐어도 b는 첫 요청이라 허용
    assert.equal(hitRateLimit('login:a', opts, 1_300).allowed, false)
    assert.equal(hitRateLimit('login:b', opts, 1_300).allowed, true)
  })

  test('윈도가 지나면 다시 허용된다', () => {
    hitRateLimit('login:ip', opts, 1_000)
    hitRateLimit('login:ip', opts, 1_100)
    hitRateLimit('login:ip', opts, 1_200)
    assert.equal(hitRateLimit('login:ip', opts, 1_300).allowed, false)
    // 윈도(60s)를 훌쩍 넘긴 시점 → 이전 기록 만료 → 허용
    assert.equal(hitRateLimit('login:ip', opts, 70_000).allowed, true)
  })
})
