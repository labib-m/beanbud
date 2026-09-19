import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScoreDisc } from '../components/ScoreDisc'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { fmtDate, groupByCafe, trend } from '../lib/stats'
import { VERDICTS } from '../lib/types'

type Sort = 'recent' | 'score' | 'visits' | 'name'

export function Notebook() {
  const { visits, error, openLog } = useVisits()
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('recent')

  const groups = useMemo(() => groupByCafe(visits ?? []), [visits])
  const cities = useMemo(() => [...new Set(groups.map((g) => g.cafe.city))].sort(), [groups])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = groups.filter((g) => {
      if (city && g.cafe.city !== city) return false
      if (!needle) return true
      const hay = [g.cafe.name, g.cafe.city, g.cafe.area, ...g.visits.flatMap((v) => v.visit_drinks.map((d) => d.drink_type))]
      return hay.join(' ').toLowerCase().includes(needle)
    })
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      recent: (a, b) => b.lastDate.localeCompare(a.lastDate),
      score: (a, b) => b.mean - a.mean,
      visits: (a, b) => b.count - a.count,
      name: (a, b) => a.cafe.name.localeCompare(b.cafe.name),
    }
    return list.sort(by[sort])
  }, [groups, q, city, sort])

  return (
    <main className="screen">
      <h1 className="title">Notebook<span className="dot">.</span></h1>
      <p className="muted spaced">
        {visits ? `${groups.length} ${groups.length === 1 ? 'cafe' : 'cafes'} · ${visits.length} ${visits.length === 1 ? 'visit' : 'visits'}` : 'Loading…'}
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      {visits && visits.length === 0 && (
        <div className="empty">
          <h2>Nothing logged yet</h2>
          <p className="muted">Start with the last cafe you sat in. A name, a city and a few ratings is enough.</p>
          <button className="btn primary" onClick={() => openLog()}>Log a visit</button>
        </div>
      )}

      {visits && visits.length > 0 && (
        <>
          <div className="controls">
            <input className="input sm" type="search" placeholder="Search name, area or drink" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="row2">
              <select className="input sm" aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All cities</option>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select className="input sm" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recent">Most recent</option>
                <option value="score">Highest rated</option>
                <option value="visits">Most visited</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {shown.length === 0 && <p className="muted">No matches. Clear the search or the city.</p>}
          <ul className="cards">
            {shown.map((g) => {
              const t = trend(g)
              const verdict = VERDICTS.find((v) => v.value === g.latest.verdict)?.label
              return (
                <li key={g.cafeId}>
                  <Link className="card" to={`/cafe/${g.cafeId}`}>
                    <div className="card-top">
                      <div>
                        <h2 className="card-name">{g.cafe.name}</h2>
                        <p className="muted small">
                          {[g.cafe.area, g.cafe.city].filter(Boolean).join(', ')} · {g.count} {g.count === 1 ? 'visit' : 'visits'}, last {fmtDate(g.lastDate)}
                        </p>
                      </div>
                      <ScoreDisc score={g.mean} />
                    </div>
                    {g.mean > 0 && <Stars value={g.mean} size={15} />}
                    <div className="tags">
                      {t !== null && (Math.abs(t) > 0.05
                        ? <span className="tag trend">{t > 0 ? 'up' : 'down'} {Math.abs(t).toFixed(1)} since last visit</span>
                        : <span className="tag muted-tag">steady since last visit</span>)}
                      {verdict && <span className="tag warm">{verdict}</span>}
                      {g.goodFor.slice(0, 3).map((x) => <span className="tag" key={x}>{x}</span>)}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}
