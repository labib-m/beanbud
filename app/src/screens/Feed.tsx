import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { fetchFeed } from '../data/social'
import { useLoad } from '../data/useLoad'
import { displayName, handleText, relTime } from '../lib/people'
import { groupByCafe, money } from '../lib/stats'
import { currencySymbol } from '../lib/types'

export function Feed() {
  const { session } = useAuth()
  const me = session!.user.id
  const { visits: mine } = useVisits()
  const { data, error, loading } = useLoad(fetchFeed, [])

  // My average per cafe, for the "You rate it" comparison line.
  const myMeans = useMemo(() => new Map(groupByCafe(mine ?? []).map((g) => [g.cafeId, g.mean])), [mine])

  return (
    <main className="screen">
      <h1 className="title">Feed<span className="dot">.</span></h1>
      <p className="muted spaced">{loading ? 'Loading…' : 'Newest first'}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {data && data.length === 0 && <p className="muted">Nothing here yet. Log a visit to get it started.</p>}

      <ul className="cards">
        {data?.map((v) => {
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
              <Link className="post-cafe" to={own ? `/cafe/${v.cafe_id}` : `/people/${v.user_id}`}>{v.cafes.name}</Link>
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
    </main>
  )
}
