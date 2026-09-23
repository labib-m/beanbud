import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { fetchLiteVisits, fetchProfiles } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, statsFor } from '../lib/people'

export function People() {
  const { session } = useAuth()
  const me = session!.user.id
  const { data, error, loading } = useLoad(async () => {
    const [profiles, visits] = await Promise.all([fetchProfiles(), fetchLiteVisits()])
    return { profiles, visits }
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    return data.profiles
      .map((p) => ({ p, s: statsFor(data.visits.filter((v) => v.user_id === p.id)) }))
      .sort((a, b) => b.s.last.localeCompare(a.s.last))
  }, [data])

  return (
    <main className="screen">
      <h1 className="title">People<span className="dot">.</span></h1>
      <p className="muted spaced">{loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'person' : 'people'}`}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="cards">
        {rows.map(({ p, s }) => (
          <li key={p.id}>
            <Link className="card person" to={p.id === me ? '/you' : `/people/${p.id}`}>
              <Avatar id={p.id} profile={p} size={46} />
              <div className="person-body">
                <h2 className="person-name">{p.id === me ? 'You' : displayName(p)}</h2>
                {handleText(p) && <p className="handle">{handleText(p)}</p>}
                {p.tagline && <p className="muted small">{p.tagline}</p>}
                <p className="muted small"><b>{s.cafes}</b> cafes · <b>{s.visits}</b> visits · avg <b>{s.average ? s.average.toFixed(1) : '–'}</b></p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
