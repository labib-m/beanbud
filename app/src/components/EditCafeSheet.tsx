import { useState, type FormEvent } from 'react'
import { editCafe, type CafeRecord } from '../data/cafes'
import { newCafeProblem } from '../lib/cafeRules'

/** Change an enlisted cafe's address and map link. Recorded in the page history under your name. */
export function EditCafeSheet({ cafe, onClose, onSaved }: { cafe: CafeRecord; onClose: () => void; onSaved: () => void }) {
  const [address, setAddress] = useState(cafe.address ?? '')
  const [mapUrl, setMapUrl] = useState(cafe.map_url ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const problem = newCafeProblem(address, mapUrl)   // same rule as a new cafe: both filled in, and a real web link
    if (problem) return setError(problem)
    if (address.trim() === (cafe.address ?? '') && mapUrl.trim() === (cafe.map_url ?? '')) return onClose()   // nothing changed
    setSaving(true)
    try {
      await editCafe(cafe.id, address, mapUrl)
      onSaved()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Edit ${cafe.name}`}>
      <form className="sheet small" onSubmit={submit}>
        <header className="sheet-head">
          <button type="button" className="link mut" onClick={onClose}>Cancel</button>
          <h2 className="sheet-title">Edit cafe</h2>
          <button type="submit" className="link acc" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </header>
        <div className="sheet-body">
          {error && <p className="error banner" role="alert">{error}</p>}
          <section className="panel">
            <span className="field-label">Cafe</span>
            <b className="edit-name">{cafe.name}</b>
            <span className="muted small">{[cafe.area, cafe.city].filter(Boolean).join(', ')} (the name and location can't be changed here)</span>
            <label className="field-label" htmlFor="ec-address">Address <span className="req">required</span></label>
            <input id="ec-address" className="input sm" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
            <label className="field-label" htmlFor="ec-map">Map link <span className="req">required</span></label>
            <input id="ec-map" type="url" className="input sm" value={mapUrl} placeholder="https://maps.app.goo.gl/…" onChange={(e) => setMapUrl(e.target.value)} />
          </section>
          <p className="muted small">
            Your change is recorded in this cafe's page history under your name. It won't change anyone's past entries, but
            new visits will use these details.
          </p>
        </div>
      </form>
    </div>
  )
}
