import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecentActivity } from '../data/social'
import { useLoad } from '../data/useLoad'
import { fmtDate, money, todayLocal } from '../lib/stats'
import { currencySymbol } from '../lib/types'
import { recentCafes, recentDrinks, type RecentCafe, type RecentDrink } from '../lib/recent'
import { segmentByDay, type DateBlock } from '../lib/segments'
import { Stars } from './Stars'

function CafeRow({ c, featured }: { c: RecentCafe; featured: boolean }) {
  const sym = c.currency ? currencySymbol(c.currency).trim() : ''
  const extra = c.drinks.map((d) => d.type + (d.price != null && d.price > 0 ? ' ' + money(Number(d.price), sym) : '')).join(', ')
  return (
    <Link className={featured ? 'featured-card' : 'plain-row'} to={`/cafe/${c.cafeId}`}>
      <div className="row-top">
        <h2 className="row-name">{c.name}</h2>
        {c.overall != null && c.overall > 0 && <span className="row-rating"><b>{c.overall.toFixed(1)}</b><Stars value={c.overall} size={14} /></span>}
      </div>
      <p className="row-meta">{[c.area, c.city].filter(Boolean).join(', ')}</p>
      {featured && extra && <p className="row-extra">{extra}</p>}
    </Link>
  )
}

function DrinkRow({ d }: { d: RecentDrink }) {
  const sym = d.currency ? currencySymbol(d.currency).trim() : ''
  return (
    <li className="plain-row">
      <div className="row-top">
        <h2 className="row-name">{d.drink}</h2>
        <span className="row-rating">{d.price != null && d.price > 0 && <span className="muted small">{money(Number(d.price), sym)}</span>}{d.score != null && <><b>{d.score.toFixed(1)}</b><Stars value={d.score} size={14} /></>}</span>
      </div>
      <p className="row-meta">{d.cafeName} · {fmtDate(d.visitedOn)}</p>
    </li>
  )
}

/** The display only: given the lists, draw them. (Split from the data loading so it can be previewed.) */
export function RecentView({ cafes, drinks, own = false, name }: { cafes: RecentCafe[]; drinks: RecentDrink[]; own?: boolean; name?: string }) {
  const who = own ? 'You haven' : (name ? name + " hasn" : "They haven")

  const blocks: DateBlock<RecentCafe>[] = useMemo(() => {
    const countMonth = (year: number, month: number) => {
      let n = 0
      const cafeIds = new Set<string>()
      for (const c of cafes) {
        const [vy, vm] = c.lastVisit.split('-').map(Number)
        if (vy === year && vm - 1 === month) { n++; cafeIds.add(c.cafeId) }
      }
      return { visits: n, cafes: cafeIds.size }
    }
    return segmentByDay(cafes.map((c) => ({ ...c, date: c.lastVisit })), todayLocal(), countMonth)
  }, [cafes])

  return (
    <>
      <section className="section">
        <span className="section-label">Recently visited</span>
        {cafes.length === 0 ? (
          <p className="muted">{who}'t logged a cafe yet.</p>
        ) : (
          blocks.map((block, i) => {
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
                  {block.items.map((c, j) => <li key={c.cafeId}><CafeRow c={c} featured={i === 0 && j === 0} /></li>)}
                </ul>
              </section>
            )
          })
        )}
      </section>

      <section className="section">
        <span className="section-label">{own ? 'Your recent coffee' : 'Their recent coffee'}</span>
        {drinks.length === 0 ? (
          <p className="muted">{who}'t logged a drink yet.</p>
        ) : (
          <ul className="plain-rows">{drinks.map((d, i) => <DrinkRow key={`${d.cafeId}-${d.visitedOn}-${d.drink}-${i}`} d={d} />)}</ul>
        )}
      </section>
    </>
  )
}

/**
 * "Recently visited" (5 cafes, segmented by day) and "Recent coffee" (4 drinks) for one person,
 * per specv2 §8.6.6-7. Every cafe row now links through to /cafe/:id, including for someone
 * else's notebook — CafeDetail already shows the right header (yours, or "from N friends · not
 * in your notebook") depending on whether it's in the viewer's own notebook.
 */
export function RecentSections({ userId, own = false, name }: { userId: string; own?: boolean; name?: string }) {
  const { data, error, loading } = useLoad(() => fetchRecentActivity(userId), [userId])
  const cafes = useMemo(() => recentCafes(data ?? []), [data])
  const drinks = useMemo(() => recentDrinks(data ?? []), [data])

  if (error) return <p className="error" role="alert">{error}</p>
  if (loading && !data) return <p className="muted">Loading…</p>
  return <RecentView cafes={cafes} drinks={drinks} own={own} name={name} />
}
