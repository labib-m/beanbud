import { Link } from 'react-router-dom'
import type { CafeRecord } from '../data/cafes'
import { publicNotes, recentDrinkEntries, visitorCount, type CafeRating, type CafeVisit, type CriterionAverage } from '../lib/cafeInfo'
import { describeRevision, type Revision } from '../lib/history'
import { fmtDate, money } from '../lib/stats'
import { SCORES, currencySymbol } from '../lib/types'
import { BookmarkButton } from './BookmarkButton'
import { CriteriaBar } from './CriteriaBar'
import { PersonLink } from './PersonLink'
import { VisitLog } from './VisitLog'
import { Stars } from './Stars'

type Props = {
  cafe: CafeRecord
  visits: CafeVisit[]
  revisions: Revision[]
  rating: CafeRating        // the overall average across every rated visit by everyone
  criteria: CriterionAverage[]   // the same, per rating category
  myVisitCount: number      // how many visits YOU have logged here
  onEdit: () => void
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The public page of one cafe. Display only; the screen around it loads the data. */
export function CafePageView({ cafe, visits, revisions, rating, criteria, myVisitCount, onEdit }: Props) {
  const brews = recentDrinkEntries(visits)
  const notes = publicNotes(visits)
  const people = visitorCount(visits)

  return (
    <main className="screen detail">
      <Link className="back" to="/feed?tab=directory">‹ Directory</Link>
      <header className="cafe-header">
        <h1 className="detail-name">{cafe.name}</h1>
        <p className="cafe-place">{[cafe.area, cafe.city].filter(Boolean).join(', ')} · {cafe.code}</p>
        <p className="cafe-score-line">
          <b>{rating.count > 0 ? rating.average.toFixed(1) : '–'}</b><Stars value={rating.average} size={16} />
          {rating.count > 0 ? `${rating.count} ${rating.count === 1 ? 'rating' : 'ratings'} · ` : ''}
          {visits.length} {visits.length === 1 ? 'visit' : 'visits'}{visits.length > 0 && ` by ${people} ${people === 1 ? 'person' : 'people'}`}
        </p>
        <div className="row-btns">
          <button className="btn ghost" onClick={onEdit}>Edit cafe</button>
          {myVisitCount === 0 && <BookmarkButton cafeId={cafe.id} />}
          {myVisitCount > 0 && <Link className="text-link" to={`/cafe/${cafe.id}`}>Your brews here ({myVisitCount}) →</Link>}
        </div>
      </header>

      <section className="section">
        <span className="section-label">Details</span>
        <div className="detail-fact"><span className="fact-key">Address</span><span className="fact-value">{cafe.address || 'No address yet'}</span></div>
        {cafe.map_url && <a className="text-link" href={cafe.map_url} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a>}
      </section>

      <section className="section">
        <span className="section-label">What people roast here</span>
        {criteria.every((c) => c.count === 0) ? <p className="muted">Nobody has rated it yet.</p> : (
          SCORES.map((sc) => <CriteriaBar key={sc.key} label={sc.label} value={criteria.find((c) => c.key === sc.key)?.average ?? 0} />)
        )}
      </section>

      <section className="section">
        <span className="section-label">Recent brews here</span>
        {brews.length === 0 ? <p className="muted">No brews logged yet.</p> : (
          <ul className="plain-rows">
            {brews.map((b, i) => {
              const sym = b.currency ? currencySymbol(b.currency).trim() : ''
              return (
                <li key={b.visit.id + b.drink + i}>
                  <div className="plain-row">
                    <div className="row-top">
                      <h2 className="row-name">{b.drink}</h2>
                      <span className="row-rating">
                        {b.price != null && b.price > 0 && <span className="muted small">{money(b.price, sym)}</span>}
                        {b.score != null && <><b>{b.score.toFixed(1)}</b><Stars value={b.score} size={14} /></>}
                      </span>
                    </div>
                    <p className="row-meta"><PersonLink id={b.userId} profile={b.who} handle /> · {fmtDate(b.visitedOn)}</p>
                    <VisitLog v={b.visit} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="section">
        <span className="section-label">Notes from visitors</span>
        {notes.length === 0 ? <p className="muted">Nobody has shared a note yet.</p> : (
          <ul className="plain-rows">
            {notes.map((n, i) => (
              <li key={i + n.visitedOn}>
                <div className="plain-row">
                  <p className="note-quote">{n.note}</p>
                  <p className="row-meta"><PersonLink id={n.userId} profile={n.who} /> · {fmtDate(n.visitedOn)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <span className="section-label">Page history</span>
        <p className="muted small">Every change to this page, and who made it. Changes never alter anyone's past entries; new visits use the latest details.</p>
        <ul className="plain-rows">
          {revisions.map((r) => (
            <li key={r.id}>
              <div className="plain-row">
                <p className="row-meta history-when">{stamp(r.changed_at)}</p>
                <p className="history-what">{r.changed_by ? <PersonLink id={r.changed_by} profile={r.profiles} /> : <b>Someone</b>} {describeRevision(r)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
