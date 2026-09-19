import { useState, type FormEvent } from 'react'
import { PinInput } from '../components/PinInput'
import { PIN_LENGTH, savePin } from '../data/auth'

/** Choose or change a PIN. `first` = the person has never had one. */
export function SetPin({ first, onDone, onCancel, onSignOut }: { first: boolean; onDone: () => void; onCancel?: () => void; onSignOut?: () => void }) {
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pin.length !== PIN_LENGTH) return setError(`Your PIN is ${PIN_LENGTH} digits.`)
    if (pin !== again) return setError("The two PINs don't match.")
    setSaving(true)
    const r = await savePin(pin)
    if (r.ok) return onDone()
    setError(r.message)
    setSaving(false)
  }

  return (
    <form className="stack" onSubmit={submit}>
      <h1 className="title">{first ? 'Choose a PIN' : 'New PIN'}<span className="dot">.</span></h1>
      <p className="muted">
        {first
          ? `You'll sign in with your username and this ${PIN_LENGTH}-digit PIN. Remember it: there's no email reset.`
          : `Pick a new ${PIN_LENGTH}-digit PIN. It replaces the old one.`}
      </p>
      {error && <p className="error banner" role="alert">{error}</p>}
      <PinInput id="pin1" label="PIN" value={pin} onChange={setPin} autoFocus />
      <PinInput id="pin2" label="Repeat PIN" value={again} onChange={setAgain} />
      <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save PIN'}</button>
      {onCancel && <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>}
      {onSignOut && <button className="btn ghost" type="button" onClick={onSignOut}>Back to sign in</button>}
    </form>
  )
}
