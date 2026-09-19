import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; via: 'email'; email: string }
  | { kind: 'sent'; via: 'username'; handle: string }
  | { kind: 'error'; message: string }

export function SignIn() {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function submit(e: FormEvent) {
    e.preventDefault()
    const clean = value.trim()
    if (!clean) return
    setStatus({ kind: 'sending' })

    if (clean.includes('@') && !clean.startsWith('@')) {
      const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { emailRedirectTo: window.location.origin } })
      setStatus(error ? { kind: 'error', message: error.message } : { kind: 'sent', via: 'email', email: clean })
      return
    }

    // A username: a server function finds the account and emails its owner.
    const handle = clean.replace(/^@/, '')
    const { error } = await supabase.functions.invoke('sign-in-with-username', {
      body: { username: handle, redirectTo: window.location.origin },
    })
    setStatus(
      error
        ? { kind: 'error', message: "Signing in with a username isn't available right now. Use your email instead." }
        : { kind: 'sent', via: 'username', handle },
    )
  }

  if (status.kind === 'sent') {
    return (
      <main className="screen center">
        <h1 className="title">Check your email<span className="dot">.</span></h1>
        <p className="muted">
          {status.via === 'email'
            ? <>We sent a sign-in link to <strong>{status.email}</strong>. Open it on this device and you're in.</>
            : <>If <strong>@{status.handle}</strong> exists, we've sent a sign-in link to the email address on that account. Open it on this device and you're in.</>}
        </p>
        <button className="btn ghost" onClick={() => setStatus({ kind: 'idle' })}>Back</button>
      </main>
    )
  }

  return (
    <main className="screen center">
      <h1 className="app-title">Bean Bud</h1>
      <p className="muted">Your cafe notebook. Sign in with a link, no password.</p>
      <form className="stack" onSubmit={submit}>
        <label className="field-label" htmlFor="who">Email or username</label>
        <input
          id="who" className="input" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off"
          spellCheck={false} placeholder="you@example.com or @username" value={value}
          onChange={(e) => setValue(e.target.value)} required
        />
        <button className="btn primary" type="submit" disabled={status.kind === 'sending'}>
          {status.kind === 'sending' ? 'Sending…' : 'Email me a link'}
        </button>
        {status.kind === 'error' && <p className="error" role="alert">{status.message}</p>}
        <p className="muted small">New here? Enter your email and we'll set you up.</p>
      </form>
    </main>
  )
}
