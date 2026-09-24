import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { BookmarkButton } from '../components/BookmarkButton'
import { PersonLink } from '../components/PersonLink'
import { Stars } from '../components/Stars'
import { fetchCafePage } from '../data/cafes'
import { useLoad } from '../data/useLoad'
import { useVisits } from '../data/VisitsProvider'
import { friendsAt, visitorCount } from '../lib/cafeInfo'
import { relativeDate } from '../lib/segments'
import { criteria, criterion, drinkStats, fmtDate, groupByCafe, money, todayLocal, trend, type CafeGroup } from '../lib/stats'
import { PRICE_BANDS, VERDICTS, currencySymbol, noteOf, scoreOf, type Cafe, type FullVisit } from '../lib/types'

function Sparkline({ points }: { points: { score: number; date: string }[] }) {
  const w = 300, h = 44, pad = 4
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0
  const y = (s: number) => pad + ((5 - s) / 4) * (h - pad * 2)
  const pts = points.map((p, i) => `${(pad + i * step).toFixed(1)},${y(p.score).toFixed(1)}`)
  const last = pts[pts.length - 1].split(',')
  return (
    <div className="sparkline-wrap">
      <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Overall rating across ${points.length} visits`}>
        <polyline points={pts.join(' ')} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill="var(--acc)" />
      </svg>
      <div className="sparkline-dates"><span>{fmtDate(points[0].date)}</span><span>{fmtDate(points[points.length - 1].date)}</span></div>
    </div>
  )
}

function CriteriaBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="criteria-row">
      <span className="criteria-label">{label}</span>
      <span className="criteria-track"><span className="criteria-fill" style={{ width: `${(value / 5) * 100}%` }} /></span>
      <span className="criteria-value">{value ? value.toFixed(1) : '–'}</span>
    </div>
  )
}

function FriendRow({ f }: { f: ReturnType<typeof friendsAt>[number] }) {
  return (
    <li className="friend-row">
      <Avatar id={f.userId} profile={f.who} size={30} />
      <div className="friend-body">
        <PersonLink id={f.userId} profile={f.who} handle />
        <span className="muted small">{f.visits} {f.visits === 1 ? 'visit' : 'visits'}</span>
      </div>
      <span className="friend-rating"><b>{f.average ? f.average.toFixed(1) : '–'}</b><Stars value={f.average} size={13} /></span>
    </li>
  )
}

function OrderRow({ d, currency }: { d: ReturnType<typeof drinkStats>[number]; currency: string }) {
  const price = d.prices[0]
  const sym = currencySymbol(price?.currency ?? currency).trim()
  return (
    <li className="order-row">
      <div className="row-top">
        <h2 className="row-name">{d.type}</h2>
        <span className="row-rating"><b>{d.avgScore ? d.avgScore.toFixed(1) : '–'}</b><Stars value={d.avgScore} size={14} /></span>
      </div>
      <p className="order-meta">
        {price ? money(price.avg, sym) + (d.pricedCount > 1 ? ' avg' : '') : '—'}
        {d.priceRise
          ? <span className="order-rise"> · ↑ {money(d.priceRise.amount, currencySymbol(d.priceRise.currency).trim())} since {fmtDate(d.priceRise.since)}</span>
          : <span> · {d.n} {d.n === 1 ? 'time' : 'times'} · last {fmtDate(d.lastDate)}</span>}
      </p>
    </li>
  )
}

function VisitLogRow({ v, open, onToggle, onEdit }: { v: FullVisit; open: boolean; onToggle: () => void; onEdit: () => void }) {
  const note = noteOf(v)
  const verdict = VERDICTS.find((x) => x.value === v.verdict)?.label
  const sym = v.currency ? currencySymbol(v.currency).trim() : ''
  return (
    <li className="visit-log-row">
      <button className="visit-log-head" aria-expanded={open} onClick={onToggle}>
        <span>{fmtDate(v.visited_on)}</span>
        <span className="row-rating">
          {v.overall != null && <b>{Number(v.overall).toFixed(1)}</b>}
          <Stars value={v.overall != null ? Number(v.overall) : 0} size={13} />
          <span className="caret" aria-hidden="true">{open ? '︿' : '﹀'}</span>
        </span>
      </button>
      {open && (
        <div className="visit-log-body">
          {criteria.map((c) => {
            const s = scoreOf(v, c.key)
            return <div className="criteria-row" key={c.key}><span className="criteria-label">{c.label}</span><span className="muted small">{s ?? '–'}</span></div>
          })}
          {v.visit_drinks.length > 0 && (
            <div className="visit-log-drinks">
              {v.visit_drinks.map((d) => (
                <div className="dline" key={d.id}>
                  <b>{d.drink_type}</b>
                  <span className="muted small">{d.price != null && d.price > 0 ? money(Number(d.price), sym) : 'no price'}</span>
                </div>
              ))}
            </div>
          )}
          {(verdict || v.spend) && (
            <div className="tags">
              {verdict && <span className="tag warm">{verdict}</span>}
              {v.spend && <span className="tag">{v.spend}</span>}
            </div>
          )}
          {note && <p className="visit-log-note">{note}</p>}
          <button className="text-link" onClick={onEdit}>Edit this visit</button>
        </div>
      )}
    </li>
  )
}

/** The header when this cafe IS in your notebook: your own score, trend and tags. */
function OwnHeader({ g }: { g: CafeGroup }) {
  const t = trend(g)
  const rel = relativeDate(g.lastDate, todayLocal())
  const visitsLine = rel === 'Today' ? 'today' : rel === 'Yesterday' ? 'yesterday' : `last ${rel}`
  const band = g.latest.price_band ? currencySymbol(g.latest.currency ?? '').trim().repeat(g.latest.price_band) : ''
  return (
    <>
      <p className="cafe-place">{[g.cafe.area, g.cafe.city].filter(Boolean).join(', ')}{band && ` · ${band}`}</p>
      <p className="cafe-score-line"><b>{g.mean ? g.mean.toFixed(1) : '–'}</b><Stars value={g.mean} size={16} />{g.count} {g.count === 1 ? 'visit' : 'visits'} · {visitsLine}</p>
      {t !== null && Math.abs(t) > 0.05 && (
        <p className={`cafe-trend-line ${t > 0 ? 'up' : 'down'}`}>{t > 0 ? '▲' : '▼'} {t > 0 ? 'Up' : 'Down'} {Math.abs(t).toFixed(1)} on your last visit</p>
      )}
      {g.goodFor.length > 0 && <div className="tags">{g.goodFor.map((x) => <span className="tag outline" key={x}>{x}</span>)}</div>}
    </>
  )
}

/** The header when friends have visited but you haven't: group average, no trend or tags of your own. */
function FriendsOnlyHeader({ cafe, average, friends }: { cafe: Cafe; average: number; friends: number }) {
  return (
    <>
      <p className="cafe-place">{[cafe.area, cafe.city].filter(Boolean).join(', ')}</p>
      <p className="cafe-score-line"><b>{average ? average.toFixed(1) : '–'}</b><Stars value={average} size={16} /></p>
      <p className="muted small">from {friends} {friends === 1 ? 'friend' : 'friends'} · not in your notebook</p>
      <BookmarkButton cafeId={cafe.id} />
    </>
  )
}

export function CafeDetail() {
  const { cafeId } = useParams()
  const { session } = useAuth()
  const me = session!.user.id
  const { visits, openLog, openEdit } = useVisits()
  const [openVisit, setOpenVisit] = useState<string | null>(null)
  const { data: page } = useLoad(() => (cafeId ? fetchCafePage(cafeId) : Promise.resolve(null)), [cafeId])

  const group = useMemo(() => groupByCafe(visits ?? []).find((g) => g.cafeId === cafeId), [visits, cafeId])
  const friends = useMemo(() => (page ? friendsAt(page.visits, me) : []), [page, me])

  if (!visits) return <main className="screen"><p className="muted">Loading…</p></main>

  if (!group && !page) {
    return (
      <main className="screen">
        <Link className="back" to="/">‹ Notebook</Link>
        <p className="muted">That cafe isn't in your notebook.</p>
      </main>
    )
  }

  const cafe: Cafe = group ? group.cafe : page!.cafe
  const stats = group ? drinkStats(group) : []
  const ratedWithDates = group ? group.visits.filter((v) => v.overall != null).map((v) => ({ score: Number(v.overall), date: v.visited_on })) : []
  const hours = group ? [group.latest.opens?.slice(0, 5), group.latest.closes?.slice(0, 5)].filter(Boolean).join(' – ') : ''
  const band = group ? PRICE_BANDS.find((p) => p.value === group.latest.price_band)?.label : undefined
  const facts: [string, string][] = group
    ? ([
        ['Hours', [hours, group.latest.hours_note].filter(Boolean).join(' · ')],
        ['Price', band ?? ''],
        ['Parking', [group.latest.parking, group.latest.parking_note].filter(Boolean).join(' · ')],
        ['Address', cafe.address ?? ''],
        ['Neighbourhood', group.latest.area_note ?? ''],
      ] as [string, string][]).filter(([, v]) => v)
    : ([['Address', cafe.address ?? '']] as [string, string][]).filter(([, v]) => v)

  return (
    <main className="screen detail">
      <Link className="back" to="/">‹ Notebook</Link>
      <header className="cafe-header">
        <h1 className="detail-name">{cafe.name}</h1>
        {group
          ? <OwnHeader g={group} />
          : <FriendsOnlyHeader cafe={cafe} average={page!.rating.average} friends={visitorCount(page!.visits)} />}
      </header>

      {group && (
        <section className="section">
          <span className="section-label">How it scores</span>
          {criteria.map((c) => <CriteriaBar key={c.key} label={c.label} value={criterion(group, c.key)} />)}
          {ratedWithDates.length >= 3 && <Sparkline points={ratedWithDates} />}
        </section>
      )}

      {friends.length > 0 && (
        <section className="section">
          <span className="section-label">Friends here</span>
          <ul className="plain-rows friend-rows">{friends.map((f) => <FriendRow key={f.userId} f={f} />)}</ul>
        </section>
      )}

      {stats.length > 0 && (
        <section className="section">
          <span className="section-label">What you order</span>
          <ul className="plain-rows">{stats.map((d) => <OrderRow key={d.type} d={d} currency={group!.latest.currency ?? ''} />)}</ul>
        </section>
      )}

      {(facts.length > 0 || cafe.map_url) && (
        <section className="section">
          <span className="section-label">Details</span>
          {facts.map(([k, v]) => (
            <div className="detail-fact" key={k}><span className="fact-key">{k}</span><span className="fact-value">{v}</span></div>
          ))}
          {cafe.map_url && <a className="text-link" href={cafe.map_url} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a>}
        </section>
      )}

      {group && (
        <section className="section">
          <span className="section-label">Your brews here</span>
          <ul className="plain-rows">
            {[...group.visits].reverse().map((v) => (
              <VisitLogRow key={v.id} v={v} open={openVisit === v.id} onToggle={() => setOpenVisit(openVisit === v.id ? null : v.id)} onEdit={() => openEdit(v)} />
            ))}
          </ul>
        </section>
      )}

      <button className="btn primary" onClick={() => openLog(cafe)}>{group ? 'Log another visit here' : 'Log your first visit here'}</button>
    </main>
  )
}
