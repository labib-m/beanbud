import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { RecentSections } from '../components/RecentSections'
import { AvatarPicker } from '../components/AvatarPicker'
import { fetchLiteVisits, fetchProfiles, updateProfile, type ProfileEdit } from '../data/social'
import { useLoad } from '../data/useLoad'
import { SetPin } from './SetPin'
import { displayName, emptyProfile, handleText, statsFor } from '../lib/people'

export function You() {
  const { session, signOut } = useAuth()
  const me = session!.user.id
  const [tick, setTick] = useState(0)
  const { data, error, loading } = useLoad(async () => {
    const [profiles, visits] = await Promise.all([fetchProfiles(), fetchLiteVisits()])
    return { profile: profiles.find((p) => p.id === me) ?? emptyProfile(me), stats: statsFor(visits.filter((v) => v.user_id === me)) }
  }, [me, tick])
  const [editing, setEditing] = useState(false)
  const [changingPin, setChangingPin] = useState(false)

  return (
    <main className="screen">
      <h1 className="title">You<span className="dot">.</span></h1>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {data && changingPin && <SetPin first={false} onDone={() => setChangingPin(false)} onCancel={() => setChangingPin(false)} />}

      {data && !editing && !changingPin && (
        <>
          <div className="you-card">
            <Avatar id={me} profile={data.profile} size={64} />
            <div>
              <h2 className="detail-name">{displayName(data.profile) === 'Someone' ? 'Add your name' : displayName(data.profile)}</h2>
              {handleText(data.profile) && <p className="handle">{handleText(data.profile)}</p>}
              {data.profile.home_city && <p className="muted">{data.profile.home_city} · home city</p>}
            </div>
          </div>
          {data.profile.tagline && <p className="tagline">{data.profile.tagline}</p>}
          {data.profile.usual_order && <div className="usual"><span>USUAL</span><b>{data.profile.usual_order}</b></div>}
          <div className="tiles">
            <div><b>{data.stats.cafes}</b><span>cafes</span></div>
            <div><b>{data.stats.visits}</b><span>visits</span></div>
            <div><b>{data.stats.cities}</b><span>cities</span></div>
            <div><b>{data.stats.average ? data.stats.average.toFixed(1) : '–'}</b><span>average</span></div>
          </div>
          <RecentSections userId={me} own />
          <p className="muted spaced">Other people see your name, username and these details. Your notes stay private.</p>
          <div className="row-btns">
            <button className="btn ghost" onClick={() => setEditing(true)}>Edit profile</button>
            <button className="btn ghost" onClick={() => setChangingPin(true)}>Change PIN</button>
            <button className="btn ghost" onClick={signOut}>Sign out</button>
          </div>
        </>
      )}

      {data && editing && (
        <ProfileForm
          initial={data.profile}
          onCancel={() => setEditing(false)}
          onSaved={() => { setEditing(false); setTick((t) => t + 1) }}
        />
      )}
    </main>
  )
}

function ProfileForm({ initial, onCancel, onSaved }: { initial: ReturnType<typeof emptyProfile>; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    display_name: initial.display_name ?? '', handle: initial.handle ?? '', home_city: initial.home_city ?? '',
    tagline: initial.tagline ?? '', usual_order: initial.usual_order ?? '', about: initial.about ?? '',
  })
  const [avatar, setAvatar] = useState<string | null>(initial.avatar)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const nn = (s: string) => (s.trim() === '' ? null : s.trim())
    const edit: ProfileEdit = {
      display_name: nn(f.display_name),
      handle: nn(f.handle.replace(/^@/, '').replace(/\s+/g, '')),
      home_city: nn(f.home_city), tagline: nn(f.tagline), usual_order: nn(f.usual_order), about: nn(f.about), avatar,
    }
    setSaving(true)
    try {
      await updateProfile(initial.id, edit)
      onSaved()
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Could not save.')
      setSaving(false)
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      {err && <p className="error banner" role="alert">{err}</p>}
      <span className="field-label">Avatar</span>
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <label className="field-label" htmlFor="p-name">Name</label>
      <input id="p-name" className="input sm" maxLength={60} value={f.display_name} onChange={set('display_name')} placeholder="Nabila Haque" />
      <label className="field-label" htmlFor="p-handle">Username</label>
      <input id="p-handle" className="input sm" maxLength={24} value={f.handle} onChange={set('handle')} placeholder="nabs" />
      <label className="field-label" htmlFor="p-city">Home city</label>
      <input id="p-city" className="input sm" maxLength={60} value={f.home_city} onChange={set('home_city')} placeholder="Dhaka" />
      <label className="field-label" htmlFor="p-tag">One line about you</label>
      <input id="p-tag" className="input sm" maxLength={90} value={f.tagline} onChange={set('tagline')} />
      <label className="field-label" htmlFor="p-usual">Your usual order</label>
      <input id="p-usual" className="input sm" maxLength={100} value={f.usual_order} onChange={set('usual_order')} placeholder="Flat white, oat" />
      <label className="field-label" htmlFor="p-about">More, if you want</label>
      <textarea id="p-about" className="input sm area" maxLength={400} value={f.about} onChange={set('about')} />
      <p className="muted small">Everyone who signs up can see these details. Your username is how friends find you; it is not a login.</p>
      <div className="row-btns">
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
