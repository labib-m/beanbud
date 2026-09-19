import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ScoreDisc } from '../components/ScoreDisc'
import { Stars } from '../components/Stars'
import { useVisits } from '../data/VisitsProvider'
import { criteria, criterion, drinkStats, fmtDate, groupByCafe, money } from '../lib/stats'
import { PRICE_BANDS, VERDICTS, currencySymbol, noteOf, scoreOf, type FullVisit } from '../lib/types'

function Sparkline({ points }: { points: number[] }) {
  const w = 300, h = 54, pad = 4
  const step = (w - pad * 2) / (points.length - 1)
  const y = (s: number) => pad + ((5 - s) / 4) * (h - pad * 2)
  const pts = points.map((s, i) => `${(pad + i * step).toFixed(1)},${y(s).toFixed(1)}`)
  const last = pts[pts.length - 1].split(',')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Overall rating across ${points.length} visits`}>
      <polyline points={pts.join(' ')} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--acc)" />
    </svg>
  )
}

function VisitRow({ v, open, onToggle, onEdit, currentAddress }: { v: FullVisit; open: boolean; onToggle: () => void; onEdit: () => void; currentAddress: string | null }) {
  const note = noteOf(v)
  const verdict = VERDICTS.find((x) => x.value === v.verdict)?.label
  const sym = v.currency ? currencySymbol(v.currency).trim() : ''
  // The address this visit was logged under, shown only if the cafe's page has been edited since.
  const thenAddress = v.cafe_revisions?.address ?? null
  const addressChanged = !!thenAddress && thenAddress !== (currentAddress ?? '')
  return (
    <li className="visit-row">
      <button className="visit-head" aria-expanded={open} onClick={onToggle}>
        <span className="visit-date">{fmtDate(v.visited_on)}</span>
        <span className="visit-meta">
          {v.overall != null && <Stars value={Number(v.overall)} size={12} />}
          <b>{v.overall != null ? Number(v.overall).toFixed(1) : '–'}</b>
        </span>
      </button>
      {open && (
        <div className="visit-body">
          {criteria.map((c) => {
            const s = scoreOf(v, c.key)
            return (
              <div className="crit-row" key={c.key}>
                <span className="muted">{c.label}</span>
                <Stars value={s ?? 0} size={12} />
                <span>{s ?? '–'}</span>
              </div>
            )
          })}
          {addressChanged && (
            <div className="block">
              <h4>Address when you visited</h4>
              <p className="note">{thenAddress}</p>
            </div>
          )}
          {v.visit_drinks.length > 0 && (
            <div className="block">
              <h4>Coffee</h4>
              {v.visit_drinks.map((d) => (
                <div className="dline" key={d.id}>
                  <b>{d.drink_type}</b>
                  <span>{d.price != null && d.price > 0 ? money(Number(d.price), sym) : 'no price'}</span>
                  {d.score != null && <Stars value={d.score} size={12} fill="var(--sage)" />}
                </div>
              ))}
            </div>
          )}
          <div className="tags">
            {verdict && <span className="tag warm">{verdict}</span>}
            {v.spend && <span className="tag">{v.spend}</span>}
          </div>
          {note && (
            <div className="block">
              <h4>Your notes <span className="hint">private</span></h4>
              <p className="note">{note}</p>
            </div>
          )}
          <button className="btn ghost" onClick={onEdit}>Edit this visit</button>
        </div>
      )}
    </li>
  )
}

export function CafeDetail() {
  const { cafeId } = useParams()
  const { visits, openLog, openEdit } = useVisits()
  const [openVisit, setOpenVisit] = useState<string | null>(null)

  const group = useMemo(() => groupByCafe(visits ?? []).find((g) => g.cafeId === cafeId), [visits, cafeId])

  if (!visits) return <main className="screen"><p className="muted">Loading…</p></main>
  if (!group) {
    return (
      <main className="screen">
        <Link className="back" to="/">← Notebook</Link>
        <p className="muted">That cafe isn't in your notebook.</p>
      </main>
    )
  }

  const { cafe, latest } = group
  const stats = drinkStats(group)
  const rated = group.visits.filter((v) => v.overall != null).map((v) => Number(v.overall))
  const hours = [latest.opens?.slice(0, 5), latest.closes?.slice(0, 5)].filter(Boolean).join(' – ')
  const band = PRICE_BANDS.find((p) => p.value === latest.price_band)?.label
  const facts: [string, string][] = ([
    ['Hours', [hours, latest.hours_note].filter(Boolean).join(' · ')],
    ['Price', band ?? ''],
    ['Parking', [latest.parking, latest.parking_note].filter(Boolean).join(' · ')],
    ['Address', cafe.address ?? ''],
    ['Neighbourhood', latest.area_note ?? ''],
  ] as [string, string][]).filter(([, v]) => v)

  return (
    <main className="screen detail">
      <header className="detail-head">
        <Link className="back" to="/">← Notebook</Link>
        <Link className="back" to={`/cafes/${cafe.id}`}>View the shared cafe page →</Link>
        <div className="card-top">
          <div>
            <h1 className="detail-name">{cafe.name}</h1>
            <p className="muted">{[cafe.area, cafe.city].filter(Boolean).join(', ')}</p>
            <p className="muted small">{group.count} {group.count === 1 ? 'visit' : 'visits'}, last {fmtDate(group.lastDate)}</p>
          </div>
          <ScoreDisc score={group.mean} size={62} />
        </div>
      </header>

      <section className="section">
        <h3>How it rates</h3>
        {criteria.map((c) => {
          const n = criterion(group, c.key)
          return (
            <div className="crit-row" key={c.key}>
              <span className="muted">{c.label}</span>
              <Stars value={n} size={14} fill="var(--sage)" />
              <span>{n ? n.toFixed(1) : '–'}</span>
            </div>
          )
        })}
        {rated.length >= 3 && <Sparkline points={rated} />}
      </section>

      {stats.length > 0 && (
        <section className="section">
          <h3>Coffee, across visits</h3>
          <ul className="plain">
            {stats.map((d) => (
              <li className="dline row" key={d.type}>
                <b>{d.type}</b>
                <span className="muted">
                  {d.prices.length ? d.prices.map((p) => money(p.avg, currencySymbol(p.currency).trim())).join(' / ') : 'no price'} · {d.n}×
                </span>
                {d.avgScore > 0 && <Stars value={d.avgScore} size={12} fill="var(--sage)" />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(facts.length > 0 || cafe.map_url) && (
        <section className="section">
          <h3>Good to know</h3>
          {facts.map(([k, v]) => <div className="fact" key={k}><h4>{k}</h4><p>{v}</p></div>)}
          {cafe.map_url && <div className="fact"><h4>Map</h4><p><a href={cafe.map_url} target="_blank" rel="noopener noreferrer">Open in maps</a></p></div>}
        </section>
      )}

      <section className="section">
        <h3>Visit log</h3>
        <ul className="plain">
          {[...group.visits].reverse().map((v) => (
            <VisitRow key={v.id} v={v} open={openVisit === v.id}
              onToggle={() => setOpenVisit(openVisit === v.id ? null : v.id)}
              onEdit={() => openEdit(v)} currentAddress={cafe.address} />
          ))}
        </ul>
      </section>

      <button className="btn primary" onClick={() => openLog(cafe)}>Log another visit here</button>
    </main>
  )
}
