import Link from 'next/link'
import { createMember } from '../actions'
import { MemberForm } from '../member-form'

export default function NewMemberPage() {
  return (
    <main>
      <Link href="/members" className="text-sm text-gray-500 hover:text-gray-900">
        ← 회원 목록
      </Link>

      <h1 className="mt-3 text-xl font-bold text-gray-900">회원 등록</h1>
      <p className="mt-1 text-sm text-gray-500">
        신규 회원의 기본 정보를 입력하세요.
      </p>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <MemberForm
          action={createMember}
          submitLabel="등록"
          cancelHref="/members"
        />
      </div>
    </main>
  )
}
