import { useEffect, useState, type FormEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { AvatarPicker } from '../components/AvatarPicker'
import { HANDLE_RULE, isHandleFree, updateProfile } from '../data/social'
import type { Profile } from '../lib/types'

type Check = 'idle' | 'checking' | 'free' | 'taken' | 'invalid'

export function Onboarding({ profile, onDone, onSignOut }: { profile: Profile; onDone: () => void; onSignOut?: () => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [handle, setHandle] = useState(profile.handle ?? '')
  const [avatar, setAvatar] = useState<string | null>(profile.avatar ?? '🫘')
  const [remote, setRemote] = useState<{ handle: string; free: boolean | null } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const clean = handle.trim().replace(/^@/, '')

  // idle / invalid / checking are worked out while rendering; only the
  // server's answer is stored.
  const check: Check = !clean ? 'idle'
    : !HANDLE_RULE.test(clean) ? 'invalid'
    : remote?.handle !== clean ? 'checking'
    : remote.free === null ? 'idle'
    : remote.free ? 'free' : 'taken'

  // Ask the server whether the username is free, shortly after typing stops.
  useEffect(() => {
    if (!clean || !HANDLE_RULE.test(clean)) return
    let alive = true
    const t = setTimeout(() => {
      isHandleFree(clean, profile.id)
        .then((free) => alive && setRemote({ handle: clean, free }))
        .catch(() => alive && setRemote({ handle: clean, free: null })) // the save itself still guards uniqueness
    }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [clean, profile.id])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) return setError('Add the name you want people to see.')
    if (!HANDLE_RULE.test(clean)) return setError('Usernames are 2 to 24 characters: letters, numbers, dot, dash or underscore.')
    if (check === 'taken') return setError('That username is taken. Try another.')
    setSaving(true)
    try {
      await updateProfile(profile.id, {
        display_name: displayName.trim(), handle: clean, avatar,
        home_city: profile.home_city, tagline: profile.tagline, usual_order: profile.usual_order, about: profile.about,
      })
      onDone()
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  const hint: Record<Check, string> = {
    idle: 'This is how friends find you, and how you sign in.',
    checking: 'Checking…',
    free: 'Available.',
    taken: 'Already taken.',
    invalid: '2 to 24 characters: letters, numbers, dot, dash or underscore.',
  }

  return (
    <main className="screen onboard">
      <h1 className="title">Welcome<span className="dot">.</span></h1>
      <p className="muted spaced">A few details so friends know who's who. You can change them later.</p>

      <form className="stack" onSubmit={submit}>
        {error && <p className="error banner" role="alert">{error}</p>}

        <div className="onboard-preview">
          <Avatar id={profile.id} profile={{ display_name: displayName || null, handle: clean || null, avatar }} size={64} />
          <div>
            <b>{displayName.trim() || 'Your name'}</b>
            <p className="handle">{clean ? '@' + clean : '@username'}</p>
          </div>
        </div>

        <span className="field-label">Pick an avatar</span>
        <AvatarPicker value={avatar} onChange={setAvatar} />

        <label className="field-label" htmlFor="ob-name">Display name</label>
        <input id="ob-name" className="input" maxLength={60} autoComplete="name" value={displayName}
          placeholder="What should people brew you by?" onChange={(e) => setDisplayName(e.target.value)} />

        <label className="field-label" htmlFor="ob-handle">Username</label>
        <input id="ob-handle" className="input" maxLength={25} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          value={handle} placeholder="nabs" aria-describedby="ob-hint" onChange={(e) => setHandle(e.target.value)} />
        <p id="ob-hint" className={`hint-line ${check}`}>{hint[check]}</p>

        <p className="muted small">You sign in with your username and PIN. Only your username is public.</p>

        <button className="btn primary" type="submit" disabled={saving || check === 'taken' || check === 'checking'}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
        {onSignOut && <button className="btn ghost" type="button" onClick={onSignOut}>Back to sign in</button>}
      </form>
    </main>
  )
}
