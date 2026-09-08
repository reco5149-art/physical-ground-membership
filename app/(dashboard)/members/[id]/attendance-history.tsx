import { toSeoulDate, toSeoulTime } from '@/lib/attendance/week'

export type AttendanceRecord = {
  id: string
  checked_in_at: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function weekdayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

export function AttendanceHistory({
  records,
  thisWeekCount,
  sessionsPerWeek,
  totalCount,
}: {
  records: AttendanceRecord[]
  thisWeekCount: number
  sessionsPerWeek: number | null
  totalCount: number
}) {
  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-700">출석 이력</h2>
        <p className="text-xs text-gray-500">
          이번 주{' '}
          <strong data-testid="history-week-count">
            {thisWeekCount}
            {sessionsPerWeek ? ` / ${sessionsPerWeek}` : ''}회
          </strong>
          {' · '}
          누적 <strong data-testid="history-total-count">{totalCount}회</strong>
        </p>
      </div>

      {records.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">출석 기록이 없습니다.</p>
      ) : (
        <>
          <ul data-testid="attendance-history" className="mt-4 divide-y divide-gray-100">
            {records.map((record) => {
              const date = toSeoulDate(record.checked_in_at)
              return (
                <li key={record.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-mono text-gray-900">{date}</span>
                  <span className="text-xs text-gray-400">({weekdayLabel(date)})</span>
                  <span className="text-gray-500">{toSeoulTime(record.checked_in_at)}</span>
                </li>
              )
            })}
          </ul>
          {totalCount > records.length && (
            <p className="mt-3 text-xs text-gray-400">
              최근 {records.length}건만 표시됩니다.
            </p>
          )}
        </>
      )}
    </section>
  )
}
