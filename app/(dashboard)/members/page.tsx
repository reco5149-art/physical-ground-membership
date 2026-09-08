import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { genderLabel, type Member } from '@/lib/members/types'

/** PostgREST `or` 필터에서 값 구분자로 쓰이는 문자를 제거해 필터 구문이 깨지지 않게 한다. */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[,()*\\]/g, '').trim()
}

export default async function MembersPage({
  searchParams,
}: PageProps<'/members'>) {
  const params = await searchParams
  const rawQuery = typeof params.q === 'string' ? params.q : ''
  const showInactive = params.status === 'all'
  const query = sanitizeSearch(rawQuery).slice(0, 50)

  const supabase = await createClient()
  let request = supabase
    .from('members')
    .select('id, name, phone, birth_date, gender, memo, status, created_by, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!showInactive) request = request.eq('status', 'active')
  if (query) request = request.or(`name.ilike.%${query}%,phone.ilike.%${query}%`)

  const { data, error } = await request
  const members = (data ?? []) as Member[]

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            {showInactive ? '전체' : '활성'} 회원 {members.length}명
            {members.length === 100 && ' (최대 100명까지 표시)'}
          </p>
        </div>
        <Link
          href="/members/new"
          className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          회원 등록
        </Link>
      </div>

      <form className="mt-6 flex gap-2" action="/members" method="get">
        <input
          type="search"
          name="q"
          defaultValue={rawQuery}
          placeholder="이름 또는 연락처로 검색"
          maxLength={50}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
        />
        {showInactive && <input type="hidden" name="status" value="all" />}
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          검색
        </button>
      </form>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <Link
          href={`/members${rawQuery ? `?q=${encodeURIComponent(rawQuery)}` : ''}`}
          className={
            showInactive ? 'text-gray-500 hover:text-gray-900' : 'font-semibold text-gray-900'
          }
        >
          활성 회원만
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={`/members?status=all${rawQuery ? `&q=${encodeURIComponent(rawQuery)}` : ''}`}
          className={
            showInactive ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-900'
          }
        >
          비활성 포함 전체
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {!error && members.length === 0 && (
        <p
          data-testid="empty-state"
          className="mt-6 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500"
        >
          {rawQuery
            ? `'${rawQuery}' 검색 결과가 없습니다.`
            : '등록된 회원이 없습니다. 첫 회원을 등록해보세요.'}
        </p>
      )}

      {members.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">연락처</th>
                <th className="px-4 py-3 font-medium">성별</th>
                <th className="px-4 py-3 font-medium">생년월일</th>
                <th className="px-4 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody data-testid="member-rows">
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/members/${member.id}`}
                      className="font-medium text-gray-900 underline-offset-2 hover:underline"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{genderLabel(member.gender)}</td>
                  <td className="px-4 py-3 text-gray-600">{member.birth_date ?? '-'}</td>
                  <td className="px-4 py-3">
                    {member.status === 'active' ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        활성
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        비활성
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
