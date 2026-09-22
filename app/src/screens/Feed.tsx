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
import { groupByCafe, money } from '../lib/stats'
import { currencySymbol } from '../lib/types'
import { citiesOf, filterAndSort, type FeedRow } from '../lib/feedFilter'
import { emptySelection, toggleSelected, topPresets, type Selected, type Sort } from '../lib/filters'
import { featuresOf } from '../lib/visitFeatures'

const SHOW_AT_MOST = 100

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

  // My average per cafe, for the "You rate it" comparison line.
  const myMeans = useMemo(() => new Map(groupByCafe(mine ?? []).map((g) => [g.cafeId, g.mean])), [mine])

  return (
    <>
      <FilterBar
        scope="everyone" q={q} onQ={setQ} city={city} onCity={setCity} cities={cities} sort={sort} onSort={setSort}
        presets={presets} selected={sel}
        onToggle={(cat, label) => setSel((cur) => toggleSelected(cur, cat, label))}
        onClearChips={() => setSel(emptySelection())}
      />
      <p className="muted spaced">
        {loading ? 'Loading…' : rows.length === 0 ? '' : matched.length === rows.length ? `${rows.length} ${rows.length === 1 ? 'visit' : 'visits'}` : `${matched.length} of ${rows.length} visits`}
        {matched.length > SHOW_AT_MOST && ` · showing the first ${SHOW_AT_MOST}. Narrow it with a search or filter.`}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {data && data.length === 0 && <p className="muted">Nothing here yet. Log a visit to get it started.</p>}
      {data && data.length > 0 && matched.length === 0 && <p className="muted">No visits match. Clear the search, the city or the quick filters.</p>}

      <ul className="cards">
        {shown.map((v) => {
          const own = v.user_id === me
          const mineForCafe = myMeans.get(v.cafe_id)
          const drink = v.visit_drinks[0]
          const sym = v.currency ? currencySymbol(v.currency).trim() : ''
          return (
            <li key={v.id} className={`post ${own ? 'own' : 'other'}`}>
              <div className="post-head">
                <Avatar id={v.user_id} profile={v.profiles} />
                <span className="post-who">
                  <b>{own ? 'You' : displayName(v.profiles)}</b>{' '}
                  <span className="post-sub">{handleText(v.profiles)} · {relTime(v.created_at)}</span>
                </span>
                {v.overall != null && <Stars value={Number(v.overall)} size={12.5} empty={own ? 'var(--line)' : 'var(--invLine)'} />}
              </div>
              <Link className="post-cafe" to={`/cafes/${v.cafe_id}`}>{v.cafes.name}</Link>
              <p className="post-sub">
                {[v.cafes.area, v.cafes.city].filter(Boolean).join(', ')}
                {drink && ` · ${drink.drink_type}${drink.price != null && drink.price > 0 ? ' ' + money(Number(drink.price), sym) : ''}`}
              </p>
              {!own && mineForCafe != null && mineForCafe > 0 && (
                <div className="post-compare">
                  <span className="post-sub">You rate it</span>
                  <Stars value={mineForCafe} size={11} fill="var(--sage)" empty="var(--invLine)" />
                  <span className="post-sub">{mineForCafe.toFixed(1)}</span>
                  <Link className="compare" to={`/people/${v.user_id}`}>Compare ↗</Link>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function Feed() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'directory' ? 'directory' : 'activity'
  const go = (t: 'activity' | 'directory') => setParams(t === 'directory' ? { tab: 'directory' } : {}, { replace: true })

  return (
    <main className="screen">
      <h1 className="title">Feed<span className="dot">.</span></h1>
      <div className="seg" role="tablist" aria-label="Feed view">
        <button role="tab" aria-selected={tab === 'activity'} onClick={() => go('activity')}>Activity</button>
        <button role="tab" aria-selected={tab === 'directory'} onClick={() => go('directory')}>Directory</button>
      </div>
      {tab === 'directory' ? <Directory /> : <Activity />}
    </main>
  )
}
