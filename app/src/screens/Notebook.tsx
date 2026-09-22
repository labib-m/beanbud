import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScoreDisc } from '../components/ScoreDisc'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { fmtDate, groupByCafe, trend } from '../lib/stats'
import { VERDICTS } from '../lib/types'
import { FilterBar } from '../components/FilterBar'
import { emptySelection, matchesCafe, matchesSearch, toggleSelected, topPresets, type Selected, type Sort } from '../lib/filters'
import { featuresOf } from '../lib/visitFeatures'

export function Notebook() {
  const { visits, error, openLog } = useVisits()
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [sel, setSel] = useState<Selected>(emptySelection)

  const groups = useMemo(() => groupByCafe(visits ?? []), [visits])
  const cities = useMemo(() => [...new Set(groups.map((g) => g.cafe.city))].sort(), [groups])

  // Quick filters: this person's own most-used tags, drinks and amenities.
  const presets = useMemo(() => topPresets((visits ?? []).map(featuresOf)), [visits])

  const shown = useMemo(() => {
    const list = groups.filter((g) => {
      if (city && g.cafe.city !== city) return false
      if (!matchesCafe(g.visits.map(featuresOf), sel)) return false
      return matchesSearch(q, [g.cafe.name, g.cafe.city, g.cafe.area, ...g.visits.flatMap((v) => v.visit_drinks.map((d) => d.drink_type))])
    })
    const by: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      recent: (a, b) => b.lastDate.localeCompare(a.lastDate),
      score: (a, b) => b.mean - a.mean,
      visits: (a, b) => b.count - a.count,
      name: (a, b) => a.cafe.name.localeCompare(b.cafe.name),
    }
    return list.sort(by[sort])
  }, [groups, q, city, sort, sel])

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
          <FilterBar
            scope="notebook" q={q} onQ={setQ} city={city} onCity={setCity} cities={cities} sort={sort} onSort={setSort}
            presets={presets} selected={sel}
            onToggle={(cat, label) => setSel((cur) => toggleSelected(cur, cat, label))}
            onClearChips={() => setSel(emptySelection())}
          />

          {shown.length === 0 && <p className="muted">No matches. Clear the search, the city or the quick filters.</p>}
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
