import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { genderLabel, type Member } from '@/lib/members/types'
import { todayInSeoul } from '@/lib/memberships/status'
import { setMemberStatus } from '../actions'
import { EditMemberSection } from './edit-section'
import { MembershipSection, type MembershipRow } from './membership-section'

export default async function MemberDetailPage({
  params,
}: PageProps<'/members/[id]'>) {
  const { id } = await params

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('members')
    .select('id, name, phone, birth_date, gender, memo, status, created_by, created_at')
    .eq('id', id)
    .maybeSingle()

  // 존재하지 않는 id, 잘못된 형식의 id 모두 404로 처리한다.
  // (내부 오류 메시지를 그대로 노출하지 않는다 — FINAL_QA 2.3)
  if (error || !data) notFound()

  const member = data as Member
  const isActive = member.status === 'active'

  const { data: membershipData } = await supabase
    .from('memberships')
    .select('id, plan_code, plan_name, price, sessions_per_week, start_date, end_date')
    .eq('member_id', member.id)
    .order('end_date', { ascending: false })

  const memberships = (membershipData ?? []) as MembershipRow[]
  const today = todayInSeoul()

  async function toggleStatus() {
    'use server'
    await setMemberStatus(member.id, isActive ? 'inactive' : 'active')
  }

  return (
    <main>
      <Link href="/members" className="text-sm text-gray-500 hover:text-gray-900">
        ← 회원 목록
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 data-testid="member-name" className="text-xl font-bold text-gray-900">
              {member.name}
            </h1>
            {isActive ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                활성
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                비활성
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            등록일 {new Date(member.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        <form action={toggleStatus}>
          <button
            type="submit"
            data-testid="toggle-status"
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            {isActive ? '비활성화' : '다시 활성화'}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700">기본 정보</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">연락처</dt>
            <dd data-testid="member-phone" className="mt-0.5 text-gray-900">
              {member.phone}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">생년월일</dt>
            <dd className="mt-0.5 text-gray-900">{member.birth_date ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">성별</dt>
            <dd className="mt-0.5 text-gray-900">{genderLabel(member.gender)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">메모</dt>
            <dd
              data-testid="member-memo"
              className="mt-0.5 whitespace-pre-wrap text-gray-900"
            >
              {member.memo ?? '-'}
            </dd>
          </div>
        </dl>
      </div>

      <EditMemberSection member={member} />

      <MembershipSection
        memberId={member.id}
        memberships={memberships}
        today={today}
      />

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-400">
        출석 이력은 Module 6에서 이 화면에 추가될 예정입니다.
      </div>
    </main>
  )
}
