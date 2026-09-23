import { Link } from 'react-router-dom'
import type { CafeRecord } from '../data/cafes'
import { drinkReviews, publicNotes, recentLogs, visitorCount, type CafeRating, type CafeVisit } from '../lib/cafeInfo'
import { describeRevision, type Revision } from '../lib/history'
import { displayName, handleText } from '../lib/people'
import { fmtDate } from '../lib/stats'
import { Avatar } from './Avatar'
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

const Who = ({ id, p }: { id: string; p: CafeVisit['profiles'] }) => (
  <span className="who-line"><Avatar id={id} profile={p} size={24} /><b>{displayName(p)}</b> <span className="muted small">{handleText(p)}</span></span>
)

/** The cafe's overall star rating, shown beside its name. */
function RatingBadge({ rating }: { rating: CafeRating }) {
  if (rating.count === 0) return <div className="rating-badge none"><span className="muted small">No ratings yet</span></div>
  return (
    <div className="rating-badge" role="img" aria-label={`Overall rating ${rating.average.toFixed(1)} out of 5, from ${rating.count} ${rating.count === 1 ? 'rating' : 'ratings'}`}>
      <b className="rating-num">{rating.average.toFixed(1)}</b>
      <Stars value={rating.average} size={14} />
      <span className="muted small">{rating.count} {rating.count === 1 ? 'rating' : 'ratings'}</span>
    </div>
  )
}

/** The public page of one cafe. Display only; the screen around it loads the data. */
export function CafePageView({ cafe, visits, revisions, rating, myVisitCount, onEdit }: Props) {
  const logs = recentLogs(visits)
  const reviews = drinkReviews(visits)
  const notes = publicNotes(visits)
  const people = visitorCount(visits)

  return (
    <main className="screen detail">
      <header className="detail-head">
        <Link className="back" to="/feed?tab=directory">‹ Directory</Link>
        <div className="card-top">
         <div>
          <h1 className="detail-name">{cafe.name}</h1>
          <p className="muted">{[cafe.area, cafe.city].filter(Boolean).join(', ')}</p>
          <p className="code">{cafe.code}</p>
          <p className="muted small">
            {visits.length} {visits.length === 1 ? 'visit' : 'visits'}{visits.length > 0 && <> by {people} {people === 1 ? 'person' : 'people'}</>}
          </p>
         </div>
         <RatingBadge rating={rating} />
        </div>

        <div className="facts">
          <div className="fact"><h4>Address</h4><p>{cafe.address || <span className="muted">No address yet</span>}</p></div>
          <div className="fact">
            <h4>Map</h4>
            <p>{cafe.map_url ? <a href={cafe.map_url} target="_blank" rel="noopener noreferrer">Open in maps</a> : <span className="muted">No map link yet</span>}</p>
          </div>
        </div>

        <button className="btn ghost" onClick={onEdit}>Edit cafe</button>
        {myVisitCount > 0 && <Link className="back" to={`/cafe/${cafe.id}`}>Your visits here ({myVisitCount}) →</Link>}
      </header>

      <section className="section">
        <h3>Recent logs</h3>
        {logs.length === 0 ? <p className="muted">No visits logged yet.</p> : (
          <ul className="plain">
            {logs.map((v) => (
              <li className="recent-row" key={v.id}>
                <span className="recent-main">
                  <Who id={v.user_id} p={v.profiles} />
                  <span className="muted small">
                    {fmtDate(v.visited_on)}
                    {v.visit_drinks.length > 0 && ' · ' + [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order).map((d) => d.drink_type).join(', ')}
                  </span>
                </span>
                {v.overall != null && Number(v.overall) > 0 && <Stars value={Number(v.overall)} size={12} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h3>Recent ratings</h3>
        {reviews.length === 0 ? <p className="muted">No ratings yet.</p> : (
          <ul className="plain">
            {reviews.map((d, i) => (
              <li className="recent-row" key={i + d.drink + d.visitedOn}>
                <span className="recent-main">
                  <b>{d.drink}</b>
                  <span className="muted small">{displayName(d.who)} · {fmtDate(d.visitedOn)}</span>
                </span>
                <Stars value={d.score} size={12} fill="var(--sage)" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h3>Notes from visitors</h3>
        {notes.length === 0 ? <p className="muted">Nobody has shared a note yet.</p> : (
          <ul className="plain">
            {notes.map((n, i) => (
              <li className="quote" key={i + n.visitedOn}>
                <p>{n.note}</p>
                <span className="muted small">{displayName(n.who)} · {fmtDate(n.visitedOn)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section history">
        <h3>Page history</h3>
        <p className="muted small">Every change to this page, and who made it. Changes never alter anyone's past entries; new visits use the latest details.</p>
        <ol className="plain">
          {revisions.map((r) => (
            <li key={r.id} className="history-row">
              <span className="muted small">{stamp(r.changed_at)}</span>
              <span><b>{r.changed_by ? displayName(r.profiles) : 'Someone'}</b> {describeRevision(r)}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
