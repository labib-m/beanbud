import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { RecentSections } from '../components/RecentSections'
import { fetchLiteVisits, fetchProfiles } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, overlaps, statsFor } from '../lib/people'

/** specv2 §8.6 (the "others" variant): back link, title "<Name>.", identity row, stats, average, intro, overlap, recents. */
export function PersonProfile() {
  const { userId } = useParams()
  const { session } = useAuth()
  const me = session!.user.id
  const { data, error, loading } = useLoad(async () => {
    const [profiles, visits] = await Promise.all([fetchProfiles(), fetchLiteVisits()])
    return { profiles, visits }
  }, [])

  const view = useMemo(() => {
    if (!data || !userId) return null
    const p = data.profiles.find((x) => x.id === userId)
    if (!p) return null
    const theirs = data.visits.filter((v) => v.user_id === userId)
    const mine = data.visits.filter((v) => v.user_id === me)
    return { p, stats: statsFor(theirs), shared: overlaps(mine, theirs) }
  }, [data, userId, me])

  if (userId === me) return <Navigate to="/you" replace />

  return (
    <main className="screen detail">
      <Link className="back" to="/people">‹ People</Link>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && !view && <p className="muted">That person isn't here.</p>}

      {view && (
        <>
          <h1 className="detail-name">{displayName(view.p)}<span className="dot">.</span></h1>
          <div className="profile-id">
            <Avatar id={view.p.id} profile={view.p} size={58} />
            <div>
              {handleText(view.p) && <p className="handle">{handleText(view.p)}</p>}
              {view.p.home_city && <p className="muted small">{view.p.home_city}</p>}
            </div>
          </div>
          <p className="stat-line">
            {view.stats.cafes} {view.stats.cafes === 1 ? 'cafe' : 'cafes'} · {view.stats.visits} {view.stats.visits === 1 ? 'visit' : 'visits'} · {view.stats.cities} {view.stats.cities === 1 ? 'city' : 'cities'}
          </p>
          <p className="avg-line">
            <span className="avg-star" aria-hidden="true">★</span>
            <b>{view.stats.average ? view.stats.average.toFixed(1) : '–'}</b> average
            {view.p.usual_order && <> · usually {view.p.usual_order}</>}
          </p>
          {view.p.tagline && <p className="profile-intro">{view.p.tagline}</p>}
          {view.p.about && <p className="muted">{view.p.about}</p>}

          <section className="section">
            <span className="section-label">Where you overlap</span>
            {view.shared.length === 0 ? (
              <p className="muted">No cafes in common yet.</p>
            ) : (
              <ul className="plain-rows">
                {view.shared.map((o) => (
                  <li key={o.cafeId}>
                    <div className="plain-row overlap-row">
                      <h2 className="row-name">{o.name}</h2>
                      <span className="overlap-scores">
                        <span className="muted small">You {o.mine ? o.mine.toFixed(1) : '–'}</span>
                        <b className={Math.abs(o.theirs - o.mine) >= 0.5 ? 'overlap-diff' : ''}>{o.theirs ? o.theirs.toFixed(1) : '–'}</b>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <RecentSections userId={view.p.id} name={displayName(view.p).split(' ')[0]} />
        </>
      )}
    </main>
  )
}
