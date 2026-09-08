'use client'

import { useState } from 'react'
import type { Member } from '@/lib/members/types'
import { updateMember } from '../actions'
import { MemberForm } from '../member-form'

export function EditMemberSection({ member }: { member: Member }) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="mt-4">
        <button
          type="button"
          data-testid="edit-toggle"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          정보 수정
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">정보 수정</h2>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          닫기
        </button>
      </div>

      <MemberForm
        action={updateMember.bind(null, member.id)}
        member={member}
        submitLabel="저장"
        cancelHref={`/members/${member.id}`}
      />
    </div>
  )
}
