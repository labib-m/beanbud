import { useState, type FormEvent } from 'react'
import { PinInput } from '../components/PinInput'
import { PIN_LENGTH, signInWithPin, signUp, takeFlash } from '../data/auth'
import { NEW_SIGNUP_KEY } from '../lib/addToHomeScreen'

type Mode = 'signin' | 'create'
const USERNAME_RULE = /^[A-Za-z0-9_.-]{2,24}$/

export function SignIn() {
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [invite, setInvite] = useState('')
  const [error, setError] = useState(() => takeFlash())
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)

  function go(next: Mode) {
    setMode(next); setError(''); setPin(''); setAgain(''); setForgot(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const name = username.trim().replace(/^@/, '')
    if (!name) return setError('Enter your username.')
    if (pin.length !== PIN_LENGTH) return setError(`Your PIN is ${PIN_LENGTH} digits.`)

    if (mode === 'create') {
      if (!USERNAME_RULE.test(name)) return setError('Usernames are 2 to 24 characters: letters, numbers, dot, dash or underscore.')
      if (pin !== again) return setError("The two PINs don't match.")
      if (!invite.trim()) return setError('Enter the invite code you were given.')
    }

    setBusy(true)
    const r = mode === 'create' ? await signUp(name, pin, invite.trim()) : await signInWithPin(name, pin)
    if (!r.ok) { setError(r.message); setPin(''); setAgain(''); setBusy(false); return }
    // on success the app switches screens by itself
    if (mode === 'create') {
      try { localStorage.setItem(NEW_SIGNUP_KEY, '1') } catch { /* the Home Screen guide just won't show; not worth failing over */ }
    }
  }

  const creating = mode === 'create'
  return (
    <main className="screen center">
      {creating
        ? <h1 className="title">Create account<span className="dot">.</span></h1>
        : <h1 className="app-title">Bean Bud</h1>}
      <p className="muted">
        {creating
          ? `Pick a username and a ${PIN_LENGTH}-digit PIN. You'll use them to sign in. There's no email and no password to reset, so remember your PIN.`
          : 'Your cafe notebook.'}
      </p>

      <form className="stack" onSubmit={submit}>
        <label className="field-label" htmlFor="username">Username</label>
        <input id="username" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <PinInput id="pin" label="PIN" value={pin} onChange={setPin} autoComplete={creating ? 'off' : 'current-password'} />
        {creating && (
          <>
            <PinInput id="pin2" label="Repeat PIN" value={again} onChange={setAgain} />
            <label className="field-label" htmlFor="invite">Invite code</label>
            <input id="invite" className="input" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="From the person who invited you" value={invite} onChange={(e) => setInvite(e.target.value)} />
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? (creating ? 'Creating…' : 'Signing in…') : (creating ? 'Create account' : 'Sign in')}
        </button>
      </form>

      <div className="row-links">
        {creating
          ? <button className="link mut" onClick={() => go('signin')}>Already have an account? Sign in</button>
          : <>
              <button className="link mut" onClick={() => go('create')}>New here? Create an account</button>
              <button className="link mut" onClick={() => setForgot((f) => !f)} aria-expanded={forgot}>Forgot your PIN?</button>
            </>}
      </div>
      {forgot && !creating && (
        <p className="muted note-box">
          There's no email reset. Contact the person who runs Bean Bud and ask them to reset your PIN. They'll give you a
          temporary one, and you'll choose your own the next time you sign in.
        </p>
      )}
    </main>
  )
}
