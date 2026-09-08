import Link from 'next/link'
import { cancelAttendance } from './actions'

export type TodayAttendanceItem = {
  id: string
  memberId: string
  name: string
  phone: string
  time: string
}

export function TodayAttendanceList({ items }: { items: TodayAttendanceItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-gray-700">
        오늘 출석 <span data-testid="today-count">{items.length}</span>명
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          아직 오늘 출석한 회원이 없습니다.
        </p>
      ) : (
        <ul data-testid="today-list" className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-gray-500">{item.time}</span>
                <Link
                  href={`/members/${item.memberId}`}
                  className="text-sm font-medium text-gray-900 underline-offset-2 hover:underline"
                >
                  {item.name}
                </Link>
                <span className="text-xs text-gray-400">{item.phone}</span>
              </div>

              <form action={cancelAttendance.bind(null, item.id, item.memberId)}>
                <button
                  type="submit"
                  className="shrink-0 text-xs text-gray-400 underline-offset-2 transition hover:text-red-600 hover:underline"
                >
                  취소
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
