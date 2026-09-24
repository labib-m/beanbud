import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stars } from '../components/Stars'
import { fetchDirectory } from '../data/cafes'
import { fetchLiteVisits } from '../data/social'
import { useLoad } from '../data/useLoad'
import { cafeRating } from '../lib/cafeInfo'
import { groupAlphabetically, matchesQuery, type DirectoryCafe } from '../lib/directory'

/** Every cafe in the shared directory, A to Z. Ranking lives in the Feed's view tabs, not here. */
export function Directory() {
  const { data, error, loading } = useLoad(async () => {
    const [cafes, visits] = await Promise.all([fetchDirectory(), fetchLiteVisits()])
    return { cafes, visits }
  }, [])
  const cafes = data?.cafes ?? null
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')

  const cities = useMemo(() => [...new Set((cafes ?? []).map((c) => c.city))].filter(Boolean).sort(), [cafes])
  const areas = useMemo(
    () => [...new Set((cafes ?? []).filter((c) => !city || c.city === city).map((c) => c.area))].filter(Boolean).sort(),
    [cafes, city],
  )

  const filtered: DirectoryCafe[] = useMemo(
    () => (cafes ?? []).filter((c) => matchesQuery(c, query) && (!city || c.city === city) && (!area || c.area === area)),
    [cafes, query, city, area],
  )
  // Same figure as the cafe's own page: the mean of every rated visit, by anyone.
  const averages = useMemo(() => {
    const byCafe = new Map<string, (number | null)[]>()
    for (const v of data?.visits ?? []) byCafe.set(v.cafe_id, [...(byCafe.get(v.cafe_id) ?? []), v.overall])
    return new Map([...byCafe].map(([id, overalls]) => [id, cafeRating(overalls).average]))
  }, [data])
  const alpha = useMemo(() => groupAlphabetically(filtered), [filtered])

  const total = cafes?.length ?? 0
  const filtering = !!(query.trim() || city || area)

  function pickCity(c: string) {
    setCity(c)
    setArea('')
  }

  if (error) return <p className="error" role="alert">{error}</p>
  if (loading && !cafes) return <p className="muted">Loading…</p>

  return (
    <>
      <div className="controls">
        <div className="search-field">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input className="search-input" type="search" placeholder="Search every cafe" aria-label="Search the directory" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button type="button" className="search-clear" onClick={() => setQuery('')}>Clear</button>}
        </div>
        <div className="filter-row">
          <span className="filter-pill-wrap">
            <select className="filter-pill" aria-label="City" value={city} onChange={(e) => pickCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </span>
          <span className="filter-pill-wrap">
            <select className="filter-pill" aria-label="Neighbourhood" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">All neighbourhoods</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </span>
        </div>
      </div>

      <p className="result-count">
        {total === 0 ? 'No cafes yet' : `${filtered.length} ${filtered.length === 1 ? 'cafe' : 'cafes'}${filtering ? '' : ', A to Z'}`}
      </p>

      {total === 0 && (
        <div className="empty">
          <h2 className="empty-headline">The directory is empty.</h2>
          <p className="empty-sub">Log a visit at a new cafe and it's added here for everyone. The directory grows with every cafe anyone logs.</p>
        </div>
      )}

      {total > 0 && filtered.length === 0 && <p className="muted">No cafes match. Clear the search or the filters.</p>}
      {alpha.map((g) => (
        <section key={g.letter} className="dir-group" aria-label={`Cafes starting with ${g.letter}`}>
          <h3 className="dir-letter">{g.letter}</h3>
          <ul className="plain">
            {g.cafes.map((c) => (
              <li key={c.id}>
                <Link className="recent-row" to={`/cafes/${c.id}`}>
                  <span className="recent-main"><b>{c.name}</b><span className="muted small">{[c.area, c.city].filter(Boolean).join(', ')}</span></span>
                  {(averages.get(c.id) ?? 0) > 0 && (
                    <span className="row-rating"><b>{averages.get(c.id)!.toFixed(1)}</b><Stars value={averages.get(c.id)!} size={13} /></span>
                  )}
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
