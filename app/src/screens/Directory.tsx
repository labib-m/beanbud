import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Stars } from '../components/Stars'
import { fetchDirectory } from '../data/cafes'
import { fetchLiteVisits, fetchProfiles } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName } from '../lib/people'
import {
  groupAlphabetically, matchesQuery, rateCafes, sortRatedCafes,
  type DirectorySort, type DirectoryCafe,
} from '../lib/directory'

type Sort = DirectorySort | 'az'

/**
 * specv2 §8.4.6: a rating leaderboard by default ("Most people", then "Top rated"), with the
 * original plain A–Z browse kept exactly as it was, as a third sort — not replaced by the
 * leaderboard, since browsing by name is still the fastest way to find a specific cafe.
 */
export function Directory() {
  const { session } = useAuth()
  const me = session!.user.id
  const { data, error, loading } = useLoad(async () => {
    const [cafes, visits, profiles] = await Promise.all([fetchDirectory(), fetchLiteVisits(), fetchProfiles()])
    return { cafes, visits, profiles }
  }, [])
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('people')

  const nameOf = useMemo(() => {
    const byId = new Map((data?.profiles ?? []).map((p) => [p.id, p]))
    return (userId: string) => displayName(byId.get(userId))
  }, [data])

  const cities = useMemo(() => [...new Set((data?.cafes ?? []).map((c) => c.city))].filter(Boolean).sort(), [data])

  const filtered: DirectoryCafe[] = useMemo(
    () => (data?.cafes ?? []).filter((c) => matchesQuery(c, query) && (!city || c.city === city)),
    [data, query, city],
  )

  const leaderboard = useMemo(
    () => (data && sort !== 'az' ? sortRatedCafes(rateCafes(filtered, data.visits, me, nameOf), sort) : []),
    [data, filtered, me, nameOf, sort],
  )
  const alpha = useMemo(() => groupAlphabetically(filtered), [filtered])

  const total = data?.cafes.length ?? 0
  const filtering = !!(query.trim() || city)

  if (error) return <p className="error" role="alert">{error}</p>
  if (loading && !data) return <p className="muted">Loading…</p>

  return (
    <>
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input className="search-input" type="search" placeholder="Search every cafe" aria-label="Search the directory" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" className="search-clear" onClick={() => setQuery('')}>Clear</button>}
      </div>
      <div className="filter-row">
        <span className="filter-pill-wrap">
          <select className="filter-pill" aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </span>
        <span className="filter-pill-wrap">
          <select className="filter-pill" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="people">Most people</option>
            <option value="rating">Top rated</option>
            <option value="az">A–Z</option>
          </select>
        </span>
      </div>

      <p className="result-count">
        {total === 0 ? 'No cafes yet'
          : sort === 'az' ? `${filtered.length} ${filtered.length === 1 ? 'cafe' : 'cafes'}${filtering ? '' : ', A to Z'}`
          : filtering ? `${leaderboard.length} ${leaderboard.length === 1 ? 'cafe' : 'cafes'} match`
          : `${leaderboard.length} ${leaderboard.length === 1 ? 'cafe' : 'cafes'} across everyone`}
      </p>

      {total === 0 && (
        <div className="empty">
          <h2 className="empty-headline">The directory is empty.</h2>
          <p className="empty-sub">Log a visit at a new cafe and it's added here for everyone. The directory grows with every cafe anyone logs.</p>
        </div>
      )}

      {total > 0 && sort !== 'az' && leaderboard.length === 0 && <p className="muted">No cafes match. Clear the search or the city.</p>}
      {total > 0 && sort !== 'az' && (
        <ul className="plain-rows">
          {leaderboard.map((c) => (
            <li key={c.id}>
              <Link className="plain-row" to={`/cafes/${c.id}`}>
                <div className="row-top">
                  <h2 className="row-name">{c.name}</h2>
                  <span className="row-rating"><b>{c.average.toFixed(1)}</b><Stars value={c.average} size={14} /></span>
                </div>
                <p className="row-meta">{[c.area, c.city].filter(Boolean).join(', ')} · {c.peopleCount} {c.peopleCount === 1 ? 'person' : 'people'}</p>
                <p className="dir-breakdown">{c.people.map((p) => `${p.name} ${p.average.toFixed(1)}`).join(' · ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && sort === 'az' && filtered.length === 0 && <p className="muted">No cafes match “{query.trim()}”.</p>}
      {total > 0 && sort === 'az' && alpha.map((g) => (
        <section key={g.letter} className="dir-group" aria-label={`Cafes starting with ${g.letter}`}>
          <h3 className="dir-letter">{g.letter}</h3>
          <ul className="plain">
            {g.cafes.map((c) => (
              <li key={c.id}>
                <Link className="recent-row" to={`/cafes/${c.id}`}>
                  <span className="recent-main"><b>{c.name}</b><span className="muted small">{[c.area, c.city].filter(Boolean).join(', ')}</span></span>
                  <span className="muted" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
