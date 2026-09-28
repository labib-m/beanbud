import { useEffect, useMemo, useState } from 'react'
import { addCafe, fetchDirectory } from '../data/cafes'
import { addBookmark } from '../data/wishlist'
import { newCafeProblem } from '../lib/cafeRules'
import type { DirectoryCafe } from '../lib/directory'
import { similarCafes } from '../lib/similar'

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Enlist a cafe into the shared directory and bookmark it, without logging a visit. */
export function AddCafeForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [cafes, setCafes] = useState<DirectoryCafe[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchDirectory().then(setCafes).catch(() => {}) }, [])

  const existing = useMemo(
    () => cafes.find((c) => norm(c.name) === norm(name) && norm(c.city) === norm(city) && norm(c.area) === norm(area)),
    [cafes, name, city, area],
  )
  const similar = useMemo(
    () => (!existing && name.trim() && city.trim() ? similarCafes({ name, city, area, mapUrl }, cafes) : []),
    [existing, name, city, area, mapUrl, cafes],
  )

  function pick(c: DirectoryCafe) {
    setName(c.name); setCity(c.city); setArea(c.area)
  }

  async function save() {
    setError('')
    if (!name.trim()) return setError('Give the cafe a name.')
    if (!city.trim()) return setError('Add the city. It tells same-named cafes apart.')
    setSaving(true)
    try {
      if (existing) {
        await addBookmark(existing.id)
      } else {
        const problem = newCafeProblem(address, mapUrl)
        if (problem) { setError(problem); setSaving(false); return }
        const cafe = await addCafe({ name: name.trim(), city: city.trim(), area: area.trim(), address: address.trim(), map_url: mapUrl.trim() })
        await addBookmark(cafe.id)
      }
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Add a cafe to your wishlist">
      <div className="sheet small">
        <header className="sheet-head">
          <button type="button" className="link mut" onClick={onClose}>Cancel</button>
          <h2 className="sheet-title">Add a cafe</h2>
          <button type="button" className="link acc" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Add to wishlist' : 'Enlist & save'}
          </button>
        </header>

        <div className="sheet-body">
          {error && <p className="error banner" role="alert">{error}</p>}

          <section className="panel">
            <label className="field-label" htmlFor="wc-name">Cafe</label>
            <input id="wc-name" className="input sm" value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Where do you want to try?" />
            <div className="row2">
              <div>
                <label className="field-label" htmlFor="wc-city">City</label>
                <input id="wc-city" className="input sm" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dhaka" />
              </div>
              <div>
                <label className="field-label" htmlFor="wc-area">Neighbourhood</label>
                <input id="wc-area" className="input sm" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Gulshan 2" />
              </div>
            </div>
            {existing && <span className="hint">Already in the directory — this just adds it to your wishlist.</span>}
          </section>

          {!existing && similar.length > 0 && (
            <div className="similar" role="note">
              <b>Is it one of these?</b>
              {similar.map((x) => (
                <button key={x.cafe.id} type="button" className="similar-row" onClick={() => pick(x.cafe)}>
                  <span><b>{x.cafe.name}</b> <span className="muted small">{[x.cafe.area, x.cafe.city].filter(Boolean).join(', ')}</span></span>
                  <span className="hint">{x.reason === 'same-map-link' ? 'same map link' : 'similar name'} · use this</span>
                </button>
              ))}
            </div>
          )}

          {!existing && (
            <section className="panel">
              <span className="field-label">New to the directory: it needs an address and a map link</span>
              <label className="field-label" htmlFor="wc-address">Address <span className="req">required</span></label>
              <input id="wc-address" className="input sm" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, area" />
              <label className="field-label" htmlFor="wc-map">Map link <span className="req">required</span></label>
              <input id="wc-map" type="url" className="input sm" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
