import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { Stars } from '../components/Stars'
import { fetchLiteVisits, fetchProfiles } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, overlaps, statsFor } from '../lib/people'

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
      <header className="detail-head">
        <Link className="back" to="/people">← People</Link>
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {view && (
          <>
            <div className="profile-top">
              <Avatar id={view.p.id} profile={view.p} size={64} />
              <div>
                <h1 className="detail-name">{displayName(view.p)}</h1>
                {handleText(view.p) && <p className="handle">{handleText(view.p)}</p>}
                {view.p.home_city && <p className="muted">{view.p.home_city} · home city</p>}
              </div>
            </div>
            {view.p.tagline && <p className="tagline">{view.p.tagline}</p>}
            {view.p.about && <p className="muted">{view.p.about}</p>}
            {view.p.usual_order && <div className="usual"><span>USUAL</span><b>{view.p.usual_order}</b></div>}
            <div className="tiles">
              <div><b>{view.stats.cafes}</b><span>cafes</span></div>
              <div><b>{view.stats.visits}</b><span>visits</span></div>
              <div><b>{view.stats.cities}</b><span>cities</span></div>
              <div><b>{view.stats.average ? view.stats.average.toFixed(1) : '–'}</b><span>average</span></div>
            </div>
          </>
        )}
      </header>

      {!loading && !error && !view && <p className="muted">That person isn't here.</p>}

      {view && (
        <section className="section">
          <h3>Where you overlap</h3>
          {view.shared.length === 0 && <p className="muted">No cafes in common yet.</p>}
          <ul className="plain">
            {view.shared.map((o) => (
              <li className="overlap" key={o.cafeId}>
                <h4>{o.name}</h4>
                <div className="crit-row"><span>You</span><Stars value={o.mine} size={12} /><span>{o.mine ? o.mine.toFixed(1) : '–'}</span></div>
                <div className="crit-row"><span>{displayName(view.p).split(' ')[0]}</span><Stars value={o.theirs} size={12} fill="var(--sage)" /><span>{o.theirs ? o.theirs.toFixed(1) : '–'}</span></div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
