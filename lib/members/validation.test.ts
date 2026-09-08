import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone, validateMemberInput } from './validation.ts'

describe('normalizePhone', () => {
  test('11자리 휴대폰 번호를 010-1234-5678 형태로 정규화한다', () => {
    assert.equal(normalizePhone('01012345678'), '010-1234-5678')
    assert.equal(normalizePhone('010-1234-5678'), '010-1234-5678')
    assert.equal(normalizePhone('010 1234 5678'), '010-1234-5678')
  })

  test('서울 지역번호(02)는 앞자리를 2자리로 끊는다', () => {
    assert.equal(normalizePhone('0212345678'), '02-1234-5678')
    assert.equal(normalizePhone('021234567'), '02-123-4567')
  })

  test('자릿수가 범위를 벗어나면 null', () => {
    assert.equal(normalizePhone('12345678'), null) // 8자리
    assert.equal(normalizePhone('012345678901'), null) // 12자리
    assert.equal(normalizePhone(''), null)
    assert.equal(normalizePhone('문자만있음'), null)
  })
})

describe('validateMemberInput', () => {
  const valid = {
    name: '홍길동',
    phone: '010-1234-5678',
    birth_date: '1990-05-10',
    gender: 'male',
    memo: '테스트',
  }

  test('정상 입력을 통과시키고 값을 정리해서 돌려준다', () => {
    const result = validateMemberInput({ ...valid, name: '  홍길동  ' })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.value.name, '홍길동')
      assert.equal(result.value.phone, '010-1234-5678')
      assert.equal(result.value.birth_date, '1990-05-10')
    }
  })

  test('선택 항목이 비어 있으면 null로 저장한다', () => {
    const result = validateMemberInput({
      name: '김철수',
      phone: '01098765432',
      birth_date: '',
      gender: '',
      memo: '',
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.value.birth_date, null)
      assert.equal(result.value.gender, null)
      assert.equal(result.value.memo, null)
    }
  })

  test('이름이 없으면 거부', () => {
    const result = validateMemberInput({ ...valid, name: '   ' })
    assert.equal(result.ok, false)
  })

  test('연락처가 없거나 형식이 틀리면 거부', () => {
    assert.equal(validateMemberInput({ ...valid, phone: '' }).ok, false)
    assert.equal(validateMemberInput({ ...valid, phone: '123' }).ok, false)
  })

  test('이름이 50자를 넘으면 거부', () => {
    assert.equal(validateMemberInput({ ...valid, name: 'a'.repeat(51) }).ok, false)
    assert.equal(validateMemberInput({ ...valid, name: 'a'.repeat(50) }).ok, true)
  })

  test('메모가 1000자를 넘으면 거부', () => {
    assert.equal(validateMemberInput({ ...valid, memo: 'a'.repeat(1001) }).ok, false)
    assert.equal(validateMemberInput({ ...valid, memo: 'a'.repeat(1000) }).ok, true)
  })

  test('존재하지 않는 날짜는 거부', () => {
    assert.equal(validateMemberInput({ ...valid, birth_date: '2026-02-31' }).ok, false)
    assert.equal(validateMemberInput({ ...valid, birth_date: '1990-13-01' }).ok, false)
    assert.equal(validateMemberInput({ ...valid, birth_date: 'abcd' }).ok, false)
  })

  test('미래 생년월일은 거부', () => {
    const future = new Date(Date.now() + 86400_000 * 2).toISOString().slice(0, 10)
    assert.equal(validateMemberInput({ ...valid, birth_date: future }).ok, false)
  })

  test('허용되지 않은 성별 값은 거부', () => {
    assert.equal(validateMemberInput({ ...valid, gender: 'other' }).ok, false)
  })

  test('XSS 시도 문자열은 값으로 그대로 보존한다 (렌더링 단계에서 이스케이프)', () => {
    const payload = '<script>alert(1)</script>'
    const result = validateMemberInput({ ...valid, memo: payload })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.value.memo, payload)
  })
})
