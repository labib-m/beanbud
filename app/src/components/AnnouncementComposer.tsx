import { useState } from 'react'
import { postAnnouncement } from '../data/announcements'

/** Admin-only (the caller checks profile.is_admin before rendering this). Posts to everyone's Brew Wire. */
export function AnnouncementComposer() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  async function send() {
    setErr('')
    if (!title.trim()) { setErr('Give it a title.'); return }
    setBusy(true)
    try {
      await postAnnouncement(title, body)
      setTitle('')
      setBody('')
      setOpen(false)
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not post.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-zone">
      <p className="section-label">Admin</p>
      <button type="button" className="btn ghost" onClick={() => { setOpen((o) => !o); setSent(false) }}>
        {open ? 'Cancel' : 'Post to Brew Wire'}
      </button>
      {sent && <p className="muted small">Sent — everyone will see it on the Brew Wire.</p>}
      {open && (
        <div className="stack">
          {err && <p className="error small" role="alert">{err}</p>}
          <input className="input sm" placeholder="Title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input sm area short" placeholder="More, if you want (optional)" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="button" className="btn primary" onClick={send} disabled={busy}>{busy ? 'Posting…' : 'Post to everyone'}</button>
        </div>
      )}
    </div>
  )
}
