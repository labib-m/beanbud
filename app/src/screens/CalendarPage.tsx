import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVisits } from '../data/VisitsProvider'
import { buildMonth, countByDay, monthsBack } from '../lib/calendar'
import { todayLocal } from '../lib/stats'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Every month you've been logging, newest first: a filled day means a cafe was logged that day. */
export function CalendarPage() {
  const { visits } = useVisits()
  const today = todayLocal()
  const months = useMemo(() => {
    const dates = (visits ?? []).map((v) => v.visited_on)
    const counts = countByDay(dates)
    return monthsBack(dates, today).map((m) => buildMonth(m.year, m.month, counts, today))
  }, [visits, today])

  return (
    <main className="screen">
      <Link className="back" to="/you">‹ You</Link>
      <h1 className="title">Calendar<span className="dot">.</span></h1>
      <p className="people-sub">Every day you brewed</p>
      {!visits && <p className="muted">Loading…</p>}
      {visits && months.map((m) => (
        <section className="cal-month" key={`${m.year}-${m.month}`} aria-label={m.label}>
          <div className="cal-head">
            <h2>{m.label}</h2>
            <span className="muted small">{m.visits} {m.visits === 1 ? 'visit' : 'visits'} · {m.days} {m.days === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="cal-grid" aria-hidden="true">
            {WEEKDAYS.map((d, i) => <span className="cal-dow" key={i}>{d}</span>)}
          </div>
          {m.weeks.map((week, wi) => (
            <div className="cal-grid" key={wi}>
              {week.map((c, di) => c === null
                ? <span key={di} />
                : (
                  <span
                    key={di}
                    className={`cal-day${c.count >= 2 ? ' many' : c.count === 1 ? ' one' : ''}${c.future ? ' future' : ''}${c.today ? ' today' : ''}`}
                    aria-label={`${m.label.split(' ')[0]} ${c.day}: ${c.count === 0 ? 'no visits' : `${c.count} ${c.count === 1 ? 'visit' : 'visits'}`}`}
                  >
                    {c.day}
                  </span>
                ))}
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}
