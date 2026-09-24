import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { Stars } from '../components/Stars'
import { fetchLiteVisits, fetchProfiles } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, statsFor } from '../lib/people'

/** specv2 §8.5: You always first, then everyone else by their most recent activity. */
export function People() {
  const { session } = useAuth()
  const me = session!.user.id
  const { data, error, loading } = useLoad(async () => {
    const [profiles, visits] = await Promise.all([fetchProfiles(), fetchLiteVisits()])
    return { profiles, visits }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    const withStats = data.profiles.map((p) => ({ p, s: statsFor(data.visits.filter((v) => v.user_id === p.id)) }))
    const mine = withStats.find((r) => r.p.id === me)
    const others = withStats.filter((r) => r.p.id !== me).sort((a, b) => b.s.last.localeCompare(a.s.last))
    return mine ? [mine, ...others] : others
  }, [data, me])

  return (
    <main className="screen">
      <div className="title-row">
        <h1 className="title">People<span className="dot">.</span></h1>
        {data && <p className="title-tally">{data.profiles.length} {data.profiles.length === 1 ? 'addict' : 'addicts'}</p>}
      </div>
      <p className="people-sub">{loading ? 'Loading…' : 'Fellow Caffeiners'}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="plain-rows">
        {rows.map(({ p, s }) => (
          <li key={p.id}>
            <Link className="plain-row" to={p.id === me ? '/you' : `/people/${p.id}`}>
              <div className="row-top people-head">
                <div className="people-id">
                  <Avatar id={p.id} profile={p} size={46} />
                  <div>
                    <h2 className="row-name">{p.id === me ? 'You' : displayName(p)} {handleText(p) && <span className="handle">{handleText(p)}</span>}</h2>
                    <p className="row-meta">{[p.home_city, `${s.cafes} ${s.cafes === 1 ? 'cafe' : 'cafes'}`, `${s.visits} ${s.visits === 1 ? 'visit' : 'visits'}`].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <span className="row-rating"><b>{s.average ? s.average.toFixed(1) : '–'}</b><Stars value={s.average} size={14} /></span>
              </div>
              {p.tagline && <p className="row-extra">{p.tagline}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
