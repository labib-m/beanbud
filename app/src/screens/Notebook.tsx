import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { relativeDate, segmentNotebook, type NotebookBlock } from '../lib/segments'
import { groupByCafe, todayLocal, trend, type CafeGroup } from '../lib/stats'
import { currencySymbol, noteOf } from '../lib/types'
import { FilterBar } from '../components/FilterBar'
import { ViewTabs } from '../components/ViewTabs'
import { emptySelection, matchesCafe, matchesSearch, SORT_TAB_LABEL, toggleSelected, topPresets, type Selected, type Sort } from '../lib/filters'
import { featuresOf } from '../lib/visitFeatures'

const TABS: Sort[] = ['recent', 'score', 'visits', 'name']

/** Area, City · <relative last visit> · N visits · <price band>, per specv2 §8.1.5. */
function metaLine(g: CafeGroup): string {
  const place = [g.cafe.area, g.cafe.city].filter(Boolean).join(', ')
  const parts = [place, relativeDate(g.lastDate, todayLocal()), `${g.count} ${g.count === 1 ? 'visit' : 'visits'}`]
  const band = g.latest.price_band
  if (band) parts.push(currencySymbol(g.latest.currency ?? '').trim().repeat(band))
  return parts.filter(Boolean).join(' · ')
}

/** The extra line on a featured card: drinks, then the private note, clamped to 2 lines by CSS. */
function extraLine(g: CafeGroup): string {
  const drinks = g.latest.visit_drinks.map((d) => d.drink_type).join(', ')
  const note = noteOf(g.latest)
  return [drinks, note].filter(Boolean).join(' — ')
}

function TrendGlyph({ g }: { g: CafeGroup }) {
  const t = trend(g)
  if (t === null || Math.abs(t) <= 0.05) return null
  return <span className={`trend-glyph ${t > 0 ? 'up' : 'down'}`} aria-label={t > 0 ? 'trending up' : 'trending down'}>{t > 0 ? '▲' : '▼'}</span>
}

function Row({ g, featured }: { g: CafeGroup; featured: boolean }) {
  return (
    <Link className={featured ? 'featured-card' : 'plain-row'} to={`/cafe/${g.cafeId}`}>
      <div className="row-top">
        <h2 className="row-name">{g.cafe.name}</h2>
        <span className="row-rating"><TrendGlyph g={g} />{g.mean > 0 && <b>{g.mean.toFixed(1)}</b>}<Stars value={g.mean} size={featured ? 15 : 14} /></span>
      </div>
      <p className="row-meta">{metaLine(g)}</p>
      {featured && extraLine(g) && <p className="row-extra">{extraLine(g)}</p>}
    </Link>
  )
}

export function Notebook() {
  const { visits, error, openLog } = useVisits()
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [sel, setSel] = useState<Selected>(emptySelection)

  const groups = useMemo(() => groupByCafe(visits ?? []), [visits])
  const cities = useMemo(() => [...new Set(groups.map((g) => g.cafe.city))].sort(), [groups])
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

  // specv2 §9.2: date/month segmentation only applies to the "Most recent" sort; any other
  // sort is a single group labelled with the sort's own name, no dividers.
  const blocks: NotebookBlock<CafeGroup>[] = useMemo(() => {
    if (sort !== 'recent') return shown.length ? [{ kind: 'group', key: sort, label: SORT_TAB_LABEL[sort], items: shown }] : []
    const countMonth = (year: number, month: number) => {
      let n = 0
      const cafeIds = new Set<string>()
      for (const g of shown) for (const v of g.visits) {
        const [vy, vm] = v.visited_on.split('-').map(Number)
        if (vy === year && vm - 1 === month) { n++; cafeIds.add(g.cafeId) }
      }
      return { visits: n, cafes: cafeIds.size }
    }
    return segmentNotebook(shown, todayLocal(), countMonth)
  }, [shown, sort])

  if (!visits) return <main className="screen"><p className="muted">Loading…</p></main>

  return (
    <main className="screen">
      <div className="title-row">
        <h1 className="title">Notebook<span className="dot">.</span></h1>
        <p className="title-tally">{groups.length} {groups.length === 1 ? 'cafe' : 'cafes'} · {visits.length} {visits.length === 1 ? 'visit' : 'visits'}</p>
      </div>
      <p className="people-sub">Your personal grind</p>

      {error && <p className="error" role="alert">{error}</p>}

      {visits.length === 0 && (
        <div className="empty">
          <h2 className="empty-headline">Nothing here yet.</h2>
          <p className="empty-sub">Start with the last cafe you sat in. A name, a city and a few ratings is enough.</p>
          <button className="btn primary" onClick={() => openLog()}>Log your first brew</button>
          <Link className="text-link" to="/feed">See where your friends have been</Link>
        </div>
      )}

      {visits.length > 0 && groups.length === 1 && (
        <>
          <Row g={groups[0]} featured />
          <p className="one-entry-note">One cafe in. Log a second visit here and the notebook starts showing whether it's getting better or worse.</p>
        </>
      )}

      {visits.length > 0 && groups.length >= 2 && (
        <>
          <ViewTabs label="Sort" tabs={TABS.map((t) => ({ key: t, label: SORT_TAB_LABEL[t] }))} value={sort} onChange={setSort} />

          <FilterBar
            scope="notebook" q={q} onQ={setQ} city={city} onCity={setCity} cities={cities}
            presets={presets} selected={sel}
            onToggle={(cat, label) => setSel((cur) => toggleSelected(cur, cat, label))}
            onClearChips={() => setSel(emptySelection())}
          />

          <p className="result-count">{shown.length} {shown.length === 1 ? 'cafe' : 'cafes'}</p>

          {shown.length === 0 && <p className="muted">No matches. Clear the search, the city or the quick filters.</p>}

          {blocks.map((block, i) => {
            if (block.kind === 'divider') {
              return (
                <div className="month-divider" key={`div-${i}`}>
                  <h3>{block.month}{block.year && <span className="year"> {block.year}</span>}</h3>
                  <span className="summary">{block.visits} {block.visits === 1 ? 'visit' : 'visits'} · {block.cafes} {block.cafes === 1 ? 'cafe' : 'cafes'}</span>
                </div>
              )
            }
            return (
              <section key={block.key}>
                <div className={`date-group${i === 0 ? ' first' : ''}`}>
                  <span className={`date-group-label${block.label === 'Today' ? ' today' : ''}`}>{block.label}</span>
                  <span className="date-group-rule" />
                </div>
                <ul className="plain-rows">
                  {block.items.map((g, j) => (
                    <li key={g.cafeId}><Row g={g} featured={sort === 'recent' && i === 0 && j === 0} /></li>
                  ))}
                </ul>
              </section>
            )
          })}
        </>
      )}
    </main>
  )
}
