import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Avatar } from '../components/Avatar'
import { ProfileSummary } from '../components/ProfileSummary'
import { MonthActivityStrip } from '../components/MonthActivityStrip'
import { RecentSections } from '../components/RecentSections'
import { AvatarPicker } from '../components/AvatarPicker'
import { NotificationsToggle } from '../components/NotificationsToggle'
import { deleteAccount } from '../data/auth'
import { fetchLiteVisits, fetchMyProfile, updateProfile, type ProfileEdit } from '../data/social'
import { useLoad } from '../data/useLoad'
import { SetPin } from './SetPin'
import { emptyProfile, identityLine, statsFor } from '../lib/people'
import { MONTH_NAMES, monthActivityCounts } from '../lib/segments'
import { todayLocal } from '../lib/stats'

export function You() {
  const { session, signOut } = useAuth()
  const me = session!.user.id
  const [tick, setTick] = useState(0)
  const { data, error, loading } = useLoad(async () => {
    const [profile, visits] = await Promise.all([fetchMyProfile(me), fetchLiteVisits()])
    const mine = visits.filter((v) => v.user_id === me)
    return { profile: profile ?? emptyProfile(me), stats: statsFor(mine), mine }
  }, [me, tick])
  const [editing, setEditing] = useState(false)
  const [changingPin, setChangingPin] = useState(false)

  // The current month (it rolls over on its own), shown once you have any visit at all so it always opens the calendar page.
  const today = todayLocal()
  const [ty, tm] = today.split('-').map(Number)
  const month = useMemo(() => {
    if (!data || data.mine.length === 0) return null
    const counts = monthActivityCounts(data.mine.map((v) => v.visited_on), ty, tm - 1)
    const inMonth = data.mine.filter((v) => v.visited_on.startsWith(`${ty}-${String(tm).padStart(2, '0')}`))
    return {
      counts,
      visits: inMonth.length,
      cafes: new Set(inMonth.map((v) => v.cafe_id)).size,
      cities: new Set(inMonth.map((v) => v.cafes.city)).size,
    }
  }, [data, ty, tm])

  return (
    <main className="screen">
      <div className="title-row profile-title">
        <h1 className="title">You<span className="dot">.</span></h1>
        {data && <Avatar id={me} profile={data.profile} size={52} />}
      </div>
      <p className="people-sub">{data ? identityLine(data.profile.handle, data.profile.home_city) || 'Add a username' : ''}</p>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {data && changingPin && <SetPin first={false} onDone={() => setChangingPin(false)} onCancel={() => setChangingPin(false)} />}

      {data && !editing && !changingPin && (
        <>
          <ProfileSummary stats={data.stats} usualOrder={data.profile.usual_order} tagline={data.profile.tagline} />

          {month && (
            <Link className="section month-summary" to="/calendar" aria-label="Open the calendar">
              <h3>{MONTH_NAMES[tm - 1]}<span className="year"> {ty}</span></h3>
              <p className="stat-line">{month.visits} {month.visits === 1 ? 'visit' : 'visits'} · {month.cafes} {month.cafes === 1 ? 'cafe' : 'cafes'} · {month.cities} {month.cities === 1 ? 'city' : 'cities'}</p>
              <MonthActivityStrip counts={month.counts} year={ty} month={tm - 1} today={today} />
              <span className="month-more">Full calendar ›</span>
            </Link>
          )}

          <RecentSections userId={me} own limit={3} />

          <NotificationsToggle />
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')
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

  async function removeAccount() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleteErr('')
    setDeleting(true)
    const r = await deleteAccount()
    if (!r.ok) { setDeleteErr(r.message); setConfirmDelete(false); setDeleting(false) }
    // on success the app signs out and switches screens by itself
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

      <div className="danger-zone">
        <p className="muted small">
          Deleting your account permanently removes your profile, every visit and drink you've logged, and your notes.
          This can't be undone.
        </p>
        {deleteErr && <p className="error small" role="alert">{deleteErr}</p>}
        <button
          type="button"
          className={`btn danger wide${confirmDelete ? ' armed' : ''}`}
          onClick={removeAccount}
          disabled={saving || deleting}
        >
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to permanently delete your account' : 'Delete my account'}
        </button>
      </div>
    </form>
  )
}
