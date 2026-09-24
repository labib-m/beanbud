import { useState } from 'react'
import { fmtDate, money } from '../lib/stats'
import { PRICE_BANDS, SCORES, VERDICTS, currencySymbol, type VisitDetail } from '../lib/types'
import { CriteriaBar } from './CriteriaBar'
import { Stars } from './Stars'

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

/** Every public detail of one visit: category ratings, drinks and prices, verdict, tags, practical notes, public note. */
export function VisitDetails({ v }: { v: VisitDetail }) {
  const sym = v.currency ? currencySymbol(v.currency).trim() : ''
  const verdict = VERDICTS.find((x) => x.value === v.verdict)?.label
  const band = PRICE_BANDS.find((p) => p.value === v.price_band)?.label
  const hours = [[hhmm(v.opens), hhmm(v.closes)].filter(Boolean).join(' – '), v.hours_note].filter(Boolean).join(' · ')
  const parking = [v.parking, v.parking_note].filter(Boolean).join(' · ')
  const scores = SCORES.map((s) => ({ label: s.label, value: v[`score_${s.key}` as const] })).filter((s) => s.value != null)
  const drinks = [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order)
  const facts: [string, string][] = ([['Hours', hours], ['Parking', parking], ['Neighbourhood', v.area_note ?? ''], ['Spent', v.spend ?? ''], ['Price band', band ?? '']] as [string, string][]).filter(([, x]) => x)
  const tags = [...v.good_for, ...v.amenities]
  const note = (v.public_note ?? '').trim()
  const empty = !scores.length && !drinks.length && !verdict && !facts.length && !tags.length && !note

  return (
    <div className="visit-log-body">
      {scores.map((s) => <CriteriaBar key={s.label} label={s.label} value={Number(s.value)} />)}
      {drinks.length > 0 && (
        <div className="visit-log-drinks">
          {drinks.map((d, i) => (
            <div className="dline" key={d.drink_type + i}>
              <b>{d.drink_type}</b>
              <span className="muted small">
                {d.price != null && d.price > 0 ? money(Number(d.price), sym) : ''}
                {d.score != null && <> <Stars value={d.score} size={11} /></>}
              </span>
            </div>
          ))}
        </div>
      )}
      {verdict && <div className="tags"><span className="tag warm">{verdict}</span></div>}
      {tags.length > 0 && <div className="tags">{v.good_for.map((t) => <span className="tag outline" key={'g' + t}>{t}</span>)}{v.amenities.map((t) => <span className="tag" key={'a' + t}>{t}</span>)}</div>}
      {facts.map(([k, x]) => <div className="detail-fact" key={k}><span className="fact-key">{k}</span><span className="fact-value">{x}</span></div>)}
      {note && <p className="visit-log-note">{note}</p>}
      {empty && <p className="muted small">Nothing else was shared about this visit. Logged {fmtDate(v.visited_on)}.</p>}
    </div>
  )
}

/** A "Details" toggle that opens every public detail of a visit in place, whoever's visit it is. */
export function VisitLog({ v }: { v: VisitDetail }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="log-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide details' : 'Details'} <span aria-hidden="true">{open ? '︿' : '﹀'}</span>
      </button>
      {open && <VisitDetails v={v} />}
    </>
  )
}
