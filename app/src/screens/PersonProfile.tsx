import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { ProfileSummary } from '../components/ProfileSummary'
import { RecentSections } from '../components/RecentSections'
import { VisitLog } from '../components/VisitLog'
import { fetchLiteVisits, fetchProfiles, fetchVisitsBy } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, identityLine, overlaps, statsFor } from '../lib/people'
import { fmtDate, money } from '../lib/stats'
import { currencySymbol } from '../lib/types'

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

  const logs = useLoad(() => (userId ? fetchVisitsBy(userId) : Promise.resolve([])), [userId])

  if (userId === me) return <Navigate to="/you" replace />

  return (
    <main className="screen detail">
      <Link className="back" to="/people">‹ People</Link>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && !view && <p className="muted">That person isn't here.</p>}

      {view && (
        <>
          <div className="title-row profile-title">
            <h1 className="detail-name">{displayName(view.p)}<span className="dot">.</span></h1>
            <Avatar id={view.p.id} profile={view.p} size={52} />
          </div>
          <p className="people-sub">{identityLine(view.p.handle, view.p.home_city)}</p>
          <ProfileSummary stats={view.stats} usualOrder={view.p.usual_order} tagline={view.p.tagline} />
          {view.p.about && <p className="muted profile-about">{view.p.about}</p>}

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

          <section className="section">
            <span className="section-label">Recent logs</span>
            {logs.error && <p className="error" role="alert">{logs.error}</p>}
            {logs.data && logs.data.length === 0 && <p className="muted">No logs yet.</p>}
            <ul className="plain-rows">
              {(logs.data ?? []).map((v) => {
                const sym = v.currency ? currencySymbol(v.currency).trim() : ''
                const drink = v.visit_drinks[0]
                return (
                  <li key={v.id}>
                    <div className="plain-row">
                      <div className="row-top">
                        <Link className="feed-cafe-name" to={`/cafes/${v.cafe_id}`}>{v.cafes.name}</Link>
                        {v.overall != null && Number(v.overall) > 0 && <span className="row-rating"><b>{Number(v.overall).toFixed(1)}</b></span>}
                      </div>
                      <p className="row-meta">
                        {fmtDate(v.visited_on)}
                        {drink && ` · ${drink.drink_type}${drink.price != null && drink.price > 0 ? ' ' + money(Number(drink.price), sym) : ''}`}
                      </p>
                      <VisitLog v={v} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
