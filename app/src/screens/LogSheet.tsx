import { useEffect, useMemo, useRef, useState } from 'react'
import { StarInput } from '../components/StarInput'
import { checkDetailsUpdate, newCafeProblem, type DetailsCheck } from '../lib/cafeRules'
import { ConfirmCafeUpdate } from '../components/ConfirmCafeUpdate'
import { similarCafes } from '../lib/similar'
import { deleteVisit, listCafes, myDrinkTypes, saveVisit } from '../data/visits'
import {
  AMENITIES, CURRENCIES, DEFAULT_DRINKS, GOOD_FOR, PARKING, PRICE_BANDS, SCORES, VERDICTS,
  currencySymbol, noteOf, scoreOf, type Cafe, type FullVisit, type ScoreKey, type Verdict, type VisitInput,
} from '../lib/types'

type DrinkRow = { type: string; price: string; score: number | null }

const CURRENCY_KEY = 'beanbud-currency'

function readCurrency(): string {
  try { return localStorage.getItem(CURRENCY_KEY) || 'BDT' } catch { return 'BDT' }
}
function rememberCurrency(c: string) {
  try { localStorage.setItem(CURRENCY_KEY, c) } catch { /* private mode: fine */ }
}
function today(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in the user's own timezone
}
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

type Props = {
  userId: string
  editing?: FullVisit // set = edit this visit
  cafe?: Cafe // set = new visit at this cafe
  onClose: () => void
  onSaved: () => void
}

export function LogSheet({ userId, editing, cafe: preset, onClose, onSaved }: Props) {
  const base = editing?.cafes ?? preset
  const [name, setName] = useState(base?.name ?? '')
  const [city, setCity] = useState(base?.city ?? '')
  const [area, setArea] = useState(base?.area ?? '')
  const [address, setAddress] = useState(base?.address ?? '')
  const [mapUrl, setMapUrl] = useState(base?.map_url ?? '')
  const [visitedOn, setVisitedOn] = useState(editing?.visited_on ?? today())
  const [scores, setScores] = useState<Record<ScoreKey, number | null>>({
    ambiance: editing ? scoreOf(editing, 'ambiance') : null,
    drinks: editing ? scoreOf(editing, 'drinks') : null,
    food: editing ? scoreOf(editing, 'food') : null,
    service: editing ? scoreOf(editing, 'service') : null,
    crowd: editing ? scoreOf(editing, 'crowd') : null,
  })
  const [drinks, setDrinks] = useState<DrinkRow[]>(
    (editing?.visit_drinks ?? []).map((d) => ({ type: d.drink_type, price: d.price == null ? '' : String(Number(d.price)), score: d.score })),
  )
  const [newDrink, setNewDrink] = useState('')
  const [currency, setCurrency] = useState(editing?.currency || readCurrency())
  const [verdict, setVerdict] = useState<Verdict | ''>(editing?.verdict ?? '')
  const [notes, setNotes] = useState(editing ? noteOf(editing) : '')
  const [publicNote, setPublicNote] = useState(editing?.public_note ?? '')
  const [more, setMore] = useState(false)
  const [priceBand, setPriceBand] = useState<number | null>(editing?.price_band ?? null)
  const [spend, setSpend] = useState(editing?.spend ?? '')
  const [opens, setOpens] = useState(editing?.opens?.slice(0, 5) ?? '')
  const [closes, setCloses] = useState(editing?.closes?.slice(0, 5) ?? '')
  const [hoursNote, setHoursNote] = useState(editing?.hours_note ?? '')
  const [parking, setParking] = useState(editing?.parking ?? '')
  const [parkingNote, setParkingNote] = useState(editing?.parking_note ?? '')
  const [areaNote, setAreaNote] = useState(editing?.area_note ?? '')
  const [goodFor, setGoodFor] = useState<string[]>(editing?.good_for ?? [])
  const [amenities, setAmenities] = useState<string[]>(editing?.amenities ?? [])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [cafes, setCafes] = useState<Cafe[]>([])
  const [cafesLoaded, setCafesLoaded] = useState(false)
  const [confirm, setConfirm] = useState<DetailsCheck | null>(null)   // set while asking whether to update the directory
  const [history, setHistory] = useState<string[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listCafes().then(setCafes).catch(() => {}).finally(() => setCafesLoaded(true))
    myDrinkTypes(userId).then(setHistory).catch(() => {})
  }, [userId])

  const suggestions = useMemo(() => {
    const q = norm(name)
    if (!q) return []
    return cafes.filter((c) => norm(c.name).includes(q)).slice(0, 6)
  }, [cafes, name])

  const catalog = useMemo(() => {
    const chosen = drinks.map((d) => d.type)
    const base = [...history, ...DEFAULT_DRINKS.filter((d) => !history.includes(d))]
    return [...base, ...chosen.filter((c) => !base.includes(c))]
  }, [history, drinks])

  // If name + city + neighbourhood match a cafe that already exists, its
  // address and map link belong to whoever added it. Show them read-only.
  const existing = useMemo(
    () => cafes.find((c) => norm(c.name) === norm(name) && norm(c.city) === norm(city) && norm(c.area) === norm(area)),
    [cafes, name, city, area],
  )

  // A cafe that already exists (picked from the dropdown, or typed exactly) keeps its own details: they are
  // shown read-only here and changed with "Edit cafe" on its page. Only a NEW cafe asks for them.
  const isNewCafe = cafesLoaded && !existing && !!name.trim() && !!city.trim()

  // Possible duplicates of a cafe that is about to be created ("did you mean...?").
  const similar = useMemo(
    () => (isNewCafe ? similarCafes({ name, city, area, mapUrl }, cafes) : []),
    [isNewCafe, name, city, area, mapUrl, cafes],
  )

  // Keep the shown details in step with whichever cafe the name / city / neighbourhood point at:
  // an existing cafe's own, or empty boxes for a new one.
  const hadExisting = useRef(false)
  useEffect(() => {
    if (existing) {
      setAddress(existing.address ?? '')
      setMapUrl(existing.map_url ?? '')
      hadExisting.current = true
    } else if (hadExisting.current) {
      setAddress('')
      setMapUrl('')
      hadExisting.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id])

  function pickCafe(c: Cafe) {
    setName(c.name); setCity(c.city); setArea(c.area)
    setAddress(c.address ?? ''); setMapUrl(c.map_url ?? '')
    setShowSuggest(false)
  }

  function toggleDrink(type: string) {
    const t = type.trim()
    if (!t) return
    setDrinks((cur) =>
      cur.some((d) => norm(d.type) === norm(t))
        ? cur.filter((d) => norm(d.type) !== norm(t))
        : [...cur, { type: t, price: '', score: null }],
    )
  }
  function patchDrink(i: number, patch: Partial<DrinkRow>) {
    setDrinks((cur) => cur.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }

  async function remove() {
    if (!editing) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    try {
      await deleteVisit(editing.id)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete. Try again.')
      setConfirmDelete(false)
      setSaving(false)
    }
  }

  /** Validates and builds what will be sent. Returns null (and shows why) if something is wrong. */
  function buildInput(updateDetails: boolean): VisitInput | null {
    const parsedDrinks: VisitInput['drinks'] = []
    for (const d of drinks) {
      const raw = d.price.trim()
      const price = raw === '' ? null : Number(raw)
      if (price !== null && (!Number.isFinite(price) || price < 0)) { setError(`Check the price for ${d.type}.`); return null }
      parsedDrinks.push({ drink_type: d.type, price, score: d.score })
    }
    // An existing cafe: a blank box keeps the saved value. Only a CONFIRMED real change updates the directory.
    const eff = existing ? checkDetailsUpdate(existing, address, mapUrl) : null
    return {
      cafe: {
        name: name.trim(), city: city.trim(), area: area.trim(),
        address: eff ? eff.address : address.trim(),
        map_url: eff ? eff.mapUrl : mapUrl.trim(),
        update_details: updateDetails && !!eff?.canUpdate,
      },
      visit: {
        visited_on: visitedOn,
        score_ambiance: scores.ambiance, score_drinks: scores.drinks, score_food: scores.food,
        score_service: scores.service, score_crowd: scores.crowd,
        verdict, currency, price_band: priceBand, spend: spend.trim(),
        opens, closes, hours_note: hoursNote.trim(),
        parking, parking_note: parkingNote.trim(), area_note: areaNote.trim(),
        good_for: goodFor, amenities, public_note: publicNote.trim(),
      },
      drinks: parsedDrinks,
      notes: notes.trim(),
    }
  }

  async function commit(updateDetails: boolean) {
    const input = buildInput(updateDetails)
    if (!input) { setConfirm(null); return }
    setSaving(true)
    try {
      await saveVisit(input, editing?.id)
      rememberCurrency(currency)
      onSaved()
    } catch (e) {
      setConfirm(null)
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  async function save() {
    setError('')
    if (!name.trim()) return setError('Give the cafe a name.')
    if (!city.trim()) return setError('Add the city. It tells same-named cafes apart.')
    if (!visitedOn) return setError('Pick the date of this visit.')
    if (isNewCafe) {
      const problem = newCafeProblem(address, mapUrl)
      if (problem) return setError(problem)
    }
    if (!buildInput(false)) return   // shows what is wrong (for example a price)

    if (existing) {
      const check = checkDetailsUpdate(existing, address, mapUrl)
      if (check.problem) return setError(check.problem)
      if (check.canUpdate) { setConfirm(check); return }   // a real change: ask before it touches the directory
    }
    await commit(false)
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={editing ? 'Edit visit' : 'New visit'}>
      <div className="sheet">
        <header className="sheet-head">
          <button type="button" className="link mut" onClick={onClose}>Cancel</button>
          <h2 className="sheet-title">{editing ? 'Edit visit' : 'New visit'}</h2>
          <button type="button" className="link acc" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isNewCafe ? 'Enlist & log' : 'Save'}
          </button>
        </header>

        <div className="sheet-body">
          {error && <p className="error banner" role="alert">{error}</p>}

          <section className="panel">
            <label className="field-label" htmlFor="f-name">Cafe</label>
            <div className="combo">
              <input
                id="f-name" className="name-input" value={name} autoComplete="off"
                placeholder="Where did you go?"
                onChange={(e) => { setName(e.target.value); setShowSuggest(true) }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              />
              {showSuggest && suggestions.length > 0 && (
                <ul className="suggest" role="listbox">
                  {suggestions.map((c) => (
                    <li key={c.id} role="option" aria-selected="false" onMouseDown={(e) => { e.preventDefault(); pickCafe(c) }}>
                      <b>{c.name}</b>
                      <span>{[c.area, c.city].filter(Boolean).join(', ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="row2">
              <div>
                <label className="field-label" htmlFor="f-city">City</label>
                <input id="f-city" className="input sm" value={city} placeholder="Dhaka" onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="f-area">Neighbourhood</label>
                <input id="f-area" className="input sm" value={area} placeholder="Gulshan 2" onChange={(e) => setArea(e.target.value)} />
              </div>
            </div>
            <label className="field-label" htmlFor="f-date">Date of this visit</label>
            <input id="f-date" type="date" className="input sm" value={visitedOn} onChange={(e) => setVisitedOn(e.target.value)} />
          </section>

          {existing && (
            <section className="panel">
              <span className="field-label">This cafe in the directory {existing.code && <span className="code">{existing.code}</span>}</span>
              <label className="field-label" htmlFor="f-address">Address</label>
              <input id="f-address" className="input sm" value={address} placeholder="Street, building, area"
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => { if (!address.trim() && existing.address) setAddress(existing.address) }} />
              <label className="field-label" htmlFor="f-map">Map link</label>
              <input id="f-map" type="url" className="input sm" value={mapUrl} placeholder="https://maps.app.goo.gl/…"
                onChange={(e) => setMapUrl(e.target.value)}
                onBlur={() => { if (!mapUrl.trim() && existing.map_url) setMapUrl(existing.map_url) }} />
              <span className="hint">
                {!existing.address || !existing.map_url
                  ? "This cafe is missing its address or map link. Add both to complete its page. You'll be asked to confirm."
                  : "Filled in from the directory. If something is out of date, fix it here: you'll be asked to confirm before it changes the cafe's page for everyone. An empty box keeps what's saved."}
              </span>
            </section>
          )}

          {isNewCafe && (
            <section className="panel">
              <span className="field-label">New cafe: it joins the shared directory</span>
              {similar.length > 0 && (
                <div className="similar" role="note">
                  <b>Is it one of these?</b>
                  {similar.map((x) => (
                    <button key={x.cafe.id} type="button" className="similar-row" onClick={() => pickCafe(x.cafe)}>
                      <span><b>{x.cafe.name}</b> <span className="muted small">{[x.cafe.area, x.cafe.city].filter(Boolean).join(', ')}</span></span>
                      <span className="hint">{x.reason === 'same-map-link' ? 'same map link' : 'similar name'} · use this</span>
                    </button>
                  ))}
                </div>
              )}
              <label className="field-label" htmlFor="f-address">Address <span className="req">required</span></label>
              <input id="f-address" className="input sm" value={address} placeholder="Street, building, area" onChange={(e) => setAddress(e.target.value)} />
              <label className="field-label" htmlFor="f-map">Map link <span className="req">required</span></label>
              <input id="f-map" type="url" className="input sm" value={mapUrl} placeholder="https://maps.app.goo.gl/…" onChange={(e) => setMapUrl(e.target.value)} />
              <span className="hint">Everyone will see these on the cafe's page, and anyone can correct them later. Visits you log afterwards fill themselves in.</span>
            </section>
          )}

          <section className="panel">
            <div className="panel-head"><span className="field-label">How was it</span><span className="hint">tap again to clear</span></div>
            {SCORES.map((s) => (
              <div className="rate-row" key={s.key}>
                <span className="rate-label">{s.label}</span>
                <StarInput label={s.label} value={scores[s.key]} onChange={(v) => setScores((c) => ({ ...c, [s.key]: v }))} />
              </div>
            ))}
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="field-label">What I drank</span>
              <select className="pill-select" aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map(([code, sym]) => <option key={code} value={code}>{sym.trim()} {code}</option>)}
              </select>
            </div>
            <div className="chips">
              {catalog.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={drinks.some((d) => norm(d.type) === norm(t))} onClick={() => toggleDrink(t)}>{t}</button>
              ))}
            </div>
            <div className="add-row">
              <input className="input sm" placeholder="Something not on the list" value={newDrink}
                onChange={(e) => setNewDrink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toggleDrink(newDrink); setNewDrink('') } }} />
              <button type="button" className="btn ghost" onClick={() => { toggleDrink(newDrink); setNewDrink('') }}>Add</button>
            </div>
            {drinks.map((d, i) => (
              <div className="drink-row" key={d.type}>
                <span className="drink-name">{d.type}</span>
                <span className="price">
                  <i>{currencySymbol(currency).trim()}</i>
                  <input type="number" min="0" step="any" inputMode="decimal" aria-label={`Price of ${d.type}`}
                    value={d.price} onChange={(e) => patchDrink(i, { price: e.target.value })} />
                </span>
                <StarInput label={`${d.type} rating`} value={d.score} size={16} hitWidth={22} onChange={(v) => patchDrink(i, { score: v })} />
                <button type="button" className="link mut" aria-label={`Remove ${d.type}`} onClick={() => toggleDrink(d.type)}>×</button>
              </div>
            ))}
          </section>

          <section className="panel">
            <label className="field-label" htmlFor="f-verdict">Verdict</label>
            <select id="f-verdict" className="input sm" value={verdict} onChange={(e) => setVerdict(e.target.value as Verdict | '')}>
              <option value="">Not set</option>
              {VERDICTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            <label className="field-label" htmlFor="f-notes">Private notes <span className="hint">only you can see these</span></label>
            <textarea id="f-notes" className="input sm area" value={notes} maxLength={5000}
              placeholder="Who was in, how loud it was, what stood out…" onChange={(e) => setNotes(e.target.value)} />
            <label className="field-label" htmlFor="f-public">Share a note about this cafe <span className="hint">everyone can read this</span></label>
            <textarea id="f-public" className="input sm area short" value={publicNote} maxLength={1000}
              placeholder="A tip for other people: best seats, when it's quiet, what to order…" onChange={(e) => setPublicNote(e.target.value)} />
          </section>

          <button type="button" className="btn ghost wide" aria-expanded={more} onClick={() => setMore((m) => !m)}>
            {more ? 'Hide the optional bits' : 'Add the optional bits'}
          </button>

          {more && (
            <>
              <section className="panel">
                <div className="row2">
                  <div><label className="field-label" htmlFor="f-opens">Opens</label><input id="f-opens" type="time" className="input sm" value={opens} onChange={(e) => setOpens(e.target.value)} /></div>
                  <div><label className="field-label" htmlFor="f-closes">Closes</label><input id="f-closes" type="time" className="input sm" value={closes} onChange={(e) => setCloses(e.target.value)} /></div>
                </div>
                <label className="field-label" htmlFor="f-hours">Hours notes</label>
                <input id="f-hours" className="input sm" value={hoursNote} placeholder="Closed Mondays, kitchen stops at 10" onChange={(e) => setHoursNote(e.target.value)} />
                <div className="row2">
                  <div>
                    <label className="field-label" htmlFor="f-band">Price band</label>
                    <select id="f-band" className="input sm" value={priceBand ?? ''} onChange={(e) => setPriceBand(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Not set</option>
                      {PRICE_BANDS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label" htmlFor="f-spend">What you spent</label><input id="f-spend" className="input sm" value={spend} placeholder="850 for two" onChange={(e) => setSpend(e.target.value)} /></div>
                </div>
              </section>

              <section className="panel">
                <span className="field-label">Good for</span>
                <div className="chips">
                  {GOOD_FOR.map((t) => <button key={t} type="button" className="chip" aria-pressed={goodFor.includes(t)} onClick={() => setGoodFor(toggle(goodFor, t))}>{t}</button>)}
                </div>
                <span className="field-label">What it has</span>
                <div className="chips">
                  {AMENITIES.map((t) => <button key={t} type="button" className="chip" aria-pressed={amenities.includes(t)} onClick={() => setAmenities(toggle(amenities, t))}>{t}</button>)}
                </div>
              </section>

              <section className="panel">
                <label className="field-label" htmlFor="f-parking">Parking</label>
                <select id="f-parking" className="input sm" value={parking} onChange={(e) => setParking(e.target.value)}>
                  <option value="">Not set</option>
                  {PARKING.map((p) => <option key={p}>{p}</option>)}
                </select>
                <label className="field-label" htmlFor="f-pnote">Parking notes</label>
                <input id="f-pnote" className="input sm" value={parkingNote} onChange={(e) => setParkingNote(e.target.value)} />
                <label className="field-label" htmlFor="f-anote">The neighbourhood around it <span className="hint">visible to other people</span></label>
                <textarea id="f-anote" className="input sm area" value={areaNote} maxLength={1000} onChange={(e) => setAreaNote(e.target.value)} />
              </section>
            </>
          )}

          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isNewCafe ? 'Enlist new cafe and log entry' : editing ? 'Save changes' : 'Save visit'}
          </button>

          {editing && (
            <button type="button" className={`btn danger wide${confirmDelete ? ' armed' : ''}`} onClick={remove} disabled={saving}>
              {confirmDelete ? 'Tap again to delete this visit' : 'Delete this visit'}
            </button>
          )}
        </div>
      </div>
      {confirm && existing && (
        <ConfirmCafeUpdate
          cafeName={existing.name} saved={existing} check={confirm} busy={saving}
          onConfirm={() => commit(true)} onSkip={() => commit(false)} onBack={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
