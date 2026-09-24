import { Link } from 'react-router-dom'
import type { CafeRecord } from '../data/cafes'
import { drinkReviews, publicNotes, recentLogs, visitorCount, type CafeRating, type CafeVisit } from '../lib/cafeInfo'
import { describeRevision, type Revision } from '../lib/history'
import { fmtDate } from '../lib/stats'
import { Avatar } from './Avatar'
import { BookmarkButton } from './BookmarkButton'
import { PersonLink } from './PersonLink'
import { VisitLog } from './VisitLog'
import { Stars } from './Stars'

type Props = {
  cafe: CafeRecord
  visits: CafeVisit[]
  revisions: Revision[]
  rating: CafeRating        // the overall average across every rated visit by everyone
  myVisitCount: number      // how many visits YOU have logged here
  onEdit: () => void
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The public page of one cafe. Display only; the screen around it loads the data. */
export function CafePageView({ cafe, visits, revisions, rating, myVisitCount, onEdit }: Props) {
  const logs = recentLogs(visits)
  const reviews = drinkReviews(visits)
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
        <span className="section-label">Recent logs</span>
        {logs.length === 0 ? <p className="muted">No visits logged yet.</p> : (
          <ul className="plain-rows">
            {logs.map((v) => {
              const drinks = [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order).map((d) => d.drink_type)
              return (
                <li key={v.id}>
                  <div className="plain-row">
                    <div className="feed-who">
                      <Avatar id={v.user_id} profile={v.profiles} size={30} />
                      <span className="feed-who-text"><PersonLink id={v.user_id} profile={v.profiles} handle /> <span className="muted small">· {fmtDate(v.visited_on)}</span></span>
                      {v.overall != null && Number(v.overall) > 0 && <span className="row-rating"><b>{Number(v.overall).toFixed(1)}</b><Stars value={Number(v.overall)} size={13} /></span>}
                    </div>
                    {drinks.length > 0 && <p className="row-meta">{drinks.join(', ')}</p>}
                    <VisitLog v={v} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="section">
        <span className="section-label">Recent ratings</span>
        {reviews.length === 0 ? <p className="muted">No ratings yet.</p> : (
          <ul className="plain-rows">
            {reviews.map((d, i) => (
              <li key={i + d.drink + d.visitedOn}>
                <div className="plain-row">
                  <div className="row-top">
                    <h2 className="row-name">{d.drink}</h2>
                    <span className="row-rating"><b>{d.score.toFixed(1)}</b><Stars value={d.score} size={14} /></span>
                  </div>
                  <p className="row-meta"><PersonLink id={d.userId} profile={d.who} /> · {fmtDate(d.visitedOn)}</p>
                </div>
              </li>
            ))}
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
