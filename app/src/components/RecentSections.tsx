import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecentActivity } from '../data/social'
import { useLoad } from '../data/useLoad'
import { fmtDate } from '../lib/stats'
import { recentCafes, recentDrinks, type RecentCafe, type RecentDrink } from '../lib/recent'
import { Stars } from './Stars'

/** The display only: given the lists, draw them. (Split from the data loading so it can be previewed.) */
export function RecentView({ cafes, drinks, own = false, name }: { cafes: RecentCafe[]; drinks: RecentDrink[]; own?: boolean; name?: string }) {
  const who = own ? 'You haven' : (name ? name + " hasn" : "They haven")
  return (
    <>
      <section className="section">
        <h3>Recently visited</h3>
        {cafes.length === 0 ? (
          <p className="muted">{who}'t logged a cafe yet.</p>
        ) : (
          <ul className="plain">
            {cafes.map((c) => {
              const inner = (
                <>
                  <span className="recent-main">
                    <b>{c.name}</b>
                    <span className="muted small">{[c.area, c.city].filter(Boolean).join(', ')} · {fmtDate(c.lastVisit)}</span>
                  </span>
                  {c.overall != null && c.overall > 0 && <Stars value={c.overall} size={12} />}
                </>
              )
              return (
                <li key={c.cafeId}>
                  {own ? <Link className="recent-row" to={`/cafe/${c.cafeId}`}>{inner}</Link> : <div className="recent-row">{inner}</div>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="section">
        <h3>Recent drinks</h3>
        {drinks.length === 0 ? (
          <p className="muted">{who}'t logged a drink yet.</p>
        ) : (
          <ul className="plain">
            {drinks.map((d, i) => (
              <li className="recent-row" key={`${d.cafeId}-${d.visitedOn}-${d.drink}-${i}`}>
                <span className="recent-main">
                  <b>{d.drink}</b>
                  <span className="muted small">{d.cafeName} · {fmtDate(d.visitedOn)}</span>
                </span>
                {d.score != null && <Stars value={d.score} size={12} fill="var(--sage)" />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/**
 * "Recently visited" (3 cafes) and "Recent drinks" (3 drinks) for one person.
 * `own` links your own cafes through to their detail page; other people's notebooks
 * have no cafe pages yet, so theirs are shown as plain rows.
 */
export function RecentSections({ userId, own = false, name }: { userId: string; own?: boolean; name?: string }) {
  const { data, error, loading } = useLoad(() => fetchRecentActivity(userId), [userId])
  const cafes = useMemo(() => recentCafes(data ?? []), [data])
  const drinks = useMemo(() => recentDrinks(data ?? []), [data])

  if (error) return <p className="error" role="alert">{error}</p>
  if (loading && !data) return <p className="muted">Loading…</p>
  return <RecentView cafes={cafes} drinks={drinks} own={own} name={name} />
}
