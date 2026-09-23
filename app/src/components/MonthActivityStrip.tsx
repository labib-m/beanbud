import { MONTH_SHORT, monthActivityBars } from '../lib/segments'

/** specv2 §7 "Month activity strip", on the You profile's monthly summary only. */
export function MonthActivityStrip({ counts, year, month, today }: { counts: number[]; year: number; month: number; today: string }) {
  const bars = monthActivityBars(counts, year, month, today)
  const todayDay = today.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) ? Number(today.slice(8, 10)) : -1
  const lastDay = bars.length

  const grid = { gridTemplateColumns: `repeat(${bars.length}, 1fr)` }
  return (
    <div className="activity-strip">
      <div className="activity-bars" style={grid}>
        {bars.map((b) => (
          <span key={b.day} className={`activity-bar ${b.color}`} style={{ height: b.height }} aria-hidden="true" />
        ))}
      </div>
      <div className="activity-labels" style={grid}>
        {bars.map((b) => {
          const label = b.day === 1 ? `1 ${MONTH_SHORT[month]}` : b.day === todayDay ? 'Today' : b.day === lastDay ? String(lastDay) : ''
          return <span key={b.day} className={`activity-label${b.day === todayDay ? ' today' : ''}${b.day === lastDay ? ' last' : ''}`}>{label}</span>
        })}
      </div>
    </div>
  )
}
