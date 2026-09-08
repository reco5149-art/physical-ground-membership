import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizeMembers,
  type MemberBasic,
  type MembershipRowForSummary,
} from './summary.ts'

const today = '2026-09-08'

const members: MemberBasic[] = [
  { id: 'm1', name: '정상회원', phone: '010-0000-0001' },
  { id: 'm2', name: '만료임박회원', phone: '010-0000-0002' },
  { id: 'm3', name: '만료회원', phone: '010-0000-0003' },
  { id: 'm4', name: '회원권없음', phone: '010-0000-0004' },
]

/** 회원권 한 건을 간단히 만드는 헬퍼 */
function mship(
  member_id: string,
  end_date: string | null,
  extra: Partial<MembershipRowForSummary> = {}
): MembershipRowForSummary {
  return {
    member_id,
    plan_name: extra.plan_name ?? '3개월 주5회',
    end_date,
    sessions_per_week: extra.sessions_per_week ?? 5,
  }
}

describe('summarizeMembers — 상태별 분류', () => {
  const result = summarizeMembers({
    members,
    memberships: [
      mship('m1', '2026-12-31'), // 정상 (한참 남음)
      mship('m2', '2026-09-12'), // 만료임박 (4일 남음)
      mship('m3', '2026-08-31'), // 만료 (지남)
      // m4는 회원권 없음
    ],
    today,
  })

  test('만료임박 회원만 expiringSoon에 담긴다', () => {
    assert.equal(result.expiringSoon.length, 1)
    assert.equal(result.expiringSoon[0].id, 'm2')
    assert.equal(result.expiringSoon[0].status, 'expiring_soon')
    assert.equal(result.expiringSoon[0].remainingDays, 4)
  })

  test('만료 회원만 expired에 담긴다', () => {
    assert.equal(result.expired.length, 1)
    assert.equal(result.expired[0].id, 'm3')
    assert.equal(result.expired[0].status, 'expired')
  })

  test('회원권 없는 회원만 noMembership에 담긴다', () => {
    assert.equal(result.noMembership.length, 1)
    assert.equal(result.noMembership[0].id, 'm4')
  })

  test('유효 회원권 수 = 정상 + 만료임박 (만료·없음 제외)', () => {
    // m1(정상) + m2(만료임박) = 2
    assert.equal(result.validMembershipCount, 2)
  })
})

describe('summarizeMembers — 대표 회원권 선택', () => {
  test('회원권이 여러 개면 종료일이 가장 늦은 것으로 판정한다', () => {
    const result = summarizeMembers({
      members: [members[0]],
      memberships: [
        mship('m1', '2026-08-31'), // 만료된 옛 회원권
        mship('m1', '2026-12-31'), // 갱신한 새 회원권 (대표)
      ],
      today,
    })
    // 대표가 새 회원권이므로 정상 → 유효 1건, 만료 목록엔 안 들어감
    assert.equal(result.expired.length, 0)
    assert.equal(result.validMembershipCount, 1)
    assert.equal(result.expiringSoon.length, 0)
  })
})

describe('summarizeMembers — 경계값', () => {
  test('오늘이 종료일이면 아직 이용 가능 → 만료임박으로 분류', () => {
    const result = summarizeMembers({
      members: [members[0]],
      memberships: [mship('m1', today)],
      today,
    })
    assert.equal(result.expired.length, 0)
    assert.equal(result.expiringSoon.length, 1)
    assert.equal(result.expiringSoon[0].remainingDays, 0)
  })

  test('어제 종료면 만료', () => {
    const result = summarizeMembers({
      members: [members[0]],
      memberships: [mship('m1', '2026-09-07')],
      today,
    })
    assert.equal(result.expired.length, 1)
    assert.equal(result.validMembershipCount, 0)
  })
})

describe('summarizeMembers — 정렬', () => {
  test('만료임박은 먼저 끝나는 회원부터 (응대 우선순위)', () => {
    const result = summarizeMembers({
      members: [
        { id: 'a', name: 'A', phone: '1' },
        { id: 'b', name: 'B', phone: '2' },
        { id: 'c', name: 'C', phone: '3' },
      ],
      memberships: [
        mship('a', '2026-09-14'),
        mship('b', '2026-09-09'),
        mship('c', '2026-09-11'),
      ],
      today,
    })
    assert.deepEqual(
      result.expiringSoon.map((m) => m.id),
      ['b', 'c', 'a']
    )
  })

  test('만료는 최근에 만료된 회원부터 (재등록 유도)', () => {
    const result = summarizeMembers({
      members: [
        { id: 'a', name: 'A', phone: '1' },
        { id: 'b', name: 'B', phone: '2' },
      ],
      memberships: [
        mship('a', '2026-01-01'), // 오래 전 만료
        mship('b', '2026-09-06'), // 최근 만료
      ],
      today,
    })
    assert.deepEqual(
      result.expired.map((m) => m.id),
      ['b', 'a']
    )
  })
})

describe('summarizeMembers — 빈 입력', () => {
  test('회원이 없으면 모든 목록이 비어 있다', () => {
    const result = summarizeMembers({ members: [], memberships: [], today })
    assert.equal(result.expiringSoon.length, 0)
    assert.equal(result.expired.length, 0)
    assert.equal(result.noMembership.length, 0)
    assert.equal(result.validMembershipCount, 0)
  })
})
