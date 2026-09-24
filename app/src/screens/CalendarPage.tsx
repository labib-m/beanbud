import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { VisitDetails } from '../components/VisitLog'
import { Stars } from '../components/Stars'
import { useAuth } from '../auth/AuthProvider'
import { useVisits } from '../data/VisitsProvider'
import { buildMonth, countByDay, monthsBack } from '../lib/calendar'
import { fmtDate, todayLocal } from '../lib/stats'
import type { FullVisit, VisitDetail } from '../lib/types'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Every month you've been logging, newest first: a filled day means a cafe was logged that day. */
export function CalendarPage() {
  const { visits, openEdit } = useVisits()
  const { session } = useAuth()
  const me = session!.user.id
  const [day, setDay] = useState<string | null>(null)
  const today = todayLocal()
  const months = useMemo(() => {
    const dates = (visits ?? []).map((v) => v.visited_on)
    const counts = countByDay(dates)
    return monthsBack(dates, today).map((m) => buildMonth(m.year, m.month, counts, today))
  }, [visits, today])

  const onDay = useMemo(() => {
    const m = new Map<string, FullVisit[]>()
    for (const v of visits ?? []) m.set(v.visited_on, [...(m.get(v.visited_on) ?? []), v])
    return m
  }, [visits])
  const dayVisits = day ? onDay.get(day) ?? [] : []
  const asDetail = (v: FullVisit): VisitDetail => ({ ...v, user_id: me })

  return (
    <main className="screen detail">
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
                : c.count > 0
                  ? (
                    <button
                      key={di} type="button" className={`cal-day${c.count >= 2 ? ' many' : ' one'}${c.today ? ' today' : ''}`}
                      aria-label={`${m.label.split(' ')[0]} ${c.day}: ${c.count} ${c.count === 1 ? 'visit' : 'visits'}. Show them`}
                      onClick={() => setDay(c.iso)}
                    >
                      {c.day}
                    </button>
                  )
                  : (
                    <span
                      key={di}
                      className={`cal-day${c.future ? ' future' : ''}${c.today ? ' today' : ''}`}
                      aria-label={`${m.label.split(' ')[0]} ${c.day}: no visits`}
                    >
                      {c.day}
                    </span>
                  )
              )}
            </div>
          ))}
        </section>
      ))}

      {day && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="That day's brews" onClick={(e) => { if (e.target === e.currentTarget) setDay(null) }}>
          <div className="sheet small">
            <header className="sheet-head">
              <span className="sheet-title">{fmtDate(day)}</span>
              <button type="button" className="link acc" onClick={() => setDay(null)}>Close</button>
            </header>
            <div className="sheet-body">
              {dayVisits.map((v) => (
                <section className="day-log" key={v.id}>
                  <div className="row-top">
                    <Link className="feed-cafe-name" to={`/cafe/${v.cafe_id}`}>{v.cafes.name}</Link>
                    {v.overall != null && Number(v.overall) > 0 && <span className="row-rating"><b>{Number(v.overall).toFixed(1)}</b><Stars value={Number(v.overall)} size={13} /></span>}
                  </div>
                  <p className="row-meta">{[v.cafes.area, v.cafes.city].filter(Boolean).join(', ')}</p>
                  <VisitDetails v={asDetail(v)} />
                  <button type="button" className="text-link" onClick={() => { setDay(null); openEdit(v) }}>Edit this visit</button>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
