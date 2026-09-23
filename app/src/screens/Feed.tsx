import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { FilterBar } from '../components/FilterBar'
import { Directory } from './Directory'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { fetchFeed } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, relTime } from '../lib/people'
import { groupByCafe, money, todayLocal } from '../lib/stats'
import { currencySymbol, type FeedVisit } from '../lib/types'
import { citiesOf, compareLabel, filterAndSort, type FeedRow } from '../lib/feedFilter'
import { emptySelection, SORT_OPTIONS, toggleSelected, topPresets, type Selected, type Sort } from '../lib/filters'
import { featuresOf } from '../lib/visitFeatures'
import { segmentByDay, type DateBlock } from '../lib/segments'

const SHOW_AT_MOST = 100

function FeedItem({ v, featured, me, mineForCafe }: { v: FeedVisit; featured: boolean; me: string; mineForCafe: number | undefined }) {
  const own = v.user_id === me
  const drink = v.visit_drinks[0]
  const sym = v.currency ? currencySymbol(v.currency).trim() : ''
  const note = (v.public_note ?? '').trim()
  return (
    <div className={featured ? 'featured-card' : 'plain-row'}>
      <div className="feed-who">
        <Avatar id={v.user_id} profile={v.profiles} size={featured ? 36 : 30} />
        <span className="feed-who-text"><b>{own ? 'You' : displayName(v.profiles)}</b> <span className="muted small">{handleText(v.profiles)} · {relTime(v.created_at)}</span></span>
        {v.overall != null && <span className="row-rating"><b>{Number(v.overall).toFixed(1)}</b><Stars value={Number(v.overall)} size={13} /></span>}
      </div>
      <Link className="feed-cafe-name" to={`/cafes/${v.cafe_id}`}>{v.cafes.name}</Link>
      <p className="row-meta">
        {[v.cafes.area, v.cafes.city].filter(Boolean).join(', ')}
        {drink && ` · ${drink.drink_type}${drink.price != null && drink.price > 0 ? ' ' + money(Number(drink.price), sym) : ''}`}
      </p>
      {note && <p className="row-extra">{note}</p>}
      {!own && mineForCafe != null && mineForCafe > 0 && (
        <p className="feed-compare">You gave it <b>{mineForCafe.toFixed(1)}</b> · {compareLabel(mineForCafe, Number(v.overall ?? 0))}</p>
      )}
    </div>
  )
}

function Activity() {
  const { session } = useAuth()
  const me = session!.user.id
  const { visits: mine } = useVisits()
  const { data, error, loading } = useLoad(() => fetchFeed(), [])

  // The same four controls as the Notebook. The search reaches every person's entries; the quick
  // filters are still YOUR most-used tags, drinks and amenities, applied to everyone's visits.
  const [q, setQ] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('recent')
  const [sel, setSel] = useState<Selected>(emptySelection)
  const presets = useMemo(() => topPresets((mine ?? []).map(featuresOf)), [mine])

  const rows: FeedRow[] = useMemo(
    () => (data ?? []).map((v) => ({
      id: v.id, cafeId: v.cafe_id, cafeName: v.cafes.name, city: v.cafes.city, area: v.cafes.area,
      visitedOn: v.visited_on, createdAt: v.created_at, overall: v.overall == null ? null : Number(v.overall),
      who: `${displayName(v.profiles)} ${handleText(v.profiles)}`.trim(), publicNote: v.public_note,
      goodFor: v.good_for ?? [], drinks: v.visit_drinks.map((d) => d.drink_type), amenities: v.amenities ?? [],
    })),
    [data],
  )
  const byId = useMemo(() => new Map((data ?? []).map((v) => [v.id, v])), [data])
  const cities = useMemo(() => citiesOf(rows), [rows])
  const matched = useMemo(() => filterAndSort(rows, { q, city, sel, sort }), [rows, q, city, sel, sort])
  const shown = matched.slice(0, SHOW_AT_MOST).map((r) => byId.get(r.id)!)

  // My average per cafe, for the "You gave it" comparison line.
  const myMeans = useMemo(() => new Map(groupByCafe(mine ?? []).map((g) => [g.cafeId, g.mean])), [mine])

  // specv2 §9.2: date segmentation only for "Most recent"; any other sort is one group named after it.
  const blocks: DateBlock<FeedVisit>[] = useMemo(() => {
    if (sort !== 'recent') {
      const label = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ''
      return shown.length ? [{ kind: 'group', key: sort, label, items: shown }] : []
    }
    const countMonth = (year: number, month: number) => {
      let n = 0
      const cafeIds = new Set<string>()
      for (const v of shown) {
        const [vy, vm] = v.visited_on.split('-').map(Number)
        if (vy === year && vm - 1 === month) { n++; cafeIds.add(v.cafe_id) }
      }
      return { visits: n, cafes: cafeIds.size }
    }
    return segmentByDay(shown.map((v) => ({ ...v, date: v.visited_on })), todayLocal(), countMonth)
  }, [shown, sort])

  return (
    <>
      <FilterBar
        scope="everyone" q={q} onQ={setQ} city={city} onCity={setCity} cities={cities} sort={sort} onSort={setSort}
        presets={presets} selected={sel}
        onToggle={(cat, label) => setSel((cur) => toggleSelected(cur, cat, label))}
        onClearChips={() => setSel(emptySelection())}
      />
      <p className="result-count">
        {loading ? 'Loading…' : rows.length === 0 ? '' : matched.length === rows.length ? `${rows.length} ${rows.length === 1 ? 'visit' : 'visits'}` : `${matched.length} of ${rows.length} visits`}
        {matched.length > SHOW_AT_MOST && ` · showing the first ${SHOW_AT_MOST}. Narrow it with a search or filter.`}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {data && data.length === 0 && <p className="muted">Nothing here yet. Log a visit to get it started.</p>}
      {data && data.length > 0 && matched.length === 0 && <p className="muted">No visits match. Clear the search, the city or the quick filters.</p>}

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
              {block.items.map((v, j) => (
                <li key={v.id}><FeedItem v={v} featured={sort === 'recent' && i === 0 && j === 0} me={me} mineForCafe={myMeans.get(v.cafe_id)} /></li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

export function Feed() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'directory' ? 'directory' : 'activity'
  const go = (t: 'activity' | 'directory') => setParams(t === 'directory' ? { tab: 'directory' } : {}, { replace: true })

  return (
    <main className="screen">
      <div className="title-row">
        <h1 className="title">Feed<span className="dot">.</span></h1>
        <div className="seg" role="tablist" aria-label="Feed view">
          <button role="tab" aria-selected={tab === 'activity'} onClick={() => go('activity')}>Activity</button>
          <button role="tab" aria-selected={tab === 'directory'} onClick={() => go('directory')}>Directory</button>
        </div>
      </div>
      {tab === 'directory' ? <Directory /> : <Activity />}
    </main>
  )
}
