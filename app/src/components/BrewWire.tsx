import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBrewWire } from '../data/BrewWireProvider'
import { sortNewest } from '../lib/announcements'
import { AnnouncementComposer } from './AnnouncementComposer'
import { ContactForm } from './ContactForm'
import { SupportInbox } from './SupportInbox'

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/**
 * Every developer announcement, newest first — the Brew Wire view in Feed. Opening it marks
 * everything as read; ?post=<id> (from the floating banner) scrolls to and highlights that post.
 * Posting and deleting are admin-only.
 */
export function BrewWire() {
  const { list, isAdmin, markSeen, removeAnnouncement } = useBrewWire()
  const [params] = useSearchParams()
  const target = params.get('post')
  const [messaging, setMessaging] = useState(false)
  const [armed, setArmed] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const sorted = sortNewest(list)
  const newestId = sorted[0]?.id

  useEffect(() => { if (newestId) markSeen(newestId) }, [newestId, markSeen])

  useEffect(() => {
    if (target) document.getElementById(`post-${target}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [target, list.length])

  async function remove(id: string) {
    if (armed !== id) { setArmed(id); return }
    setBusy(id)
    try {
      await removeAnnouncement(id)
    } finally {
      setBusy(null)
      setArmed(null)
    }
  }

  return (
    <>
      <div className="wire-contact">
        {messaging
          ? <ContactForm onDone={() => setMessaging(false)} doneLabel="Done" />
          : <button type="button" className="btn ghost" onClick={() => setMessaging(true)}>Message the developer</button>}
      </div>
      {isAdmin && <AnnouncementComposer />}
      {isAdmin && <SupportInbox />}
      {sorted.length === 0 ? (
        <p className="muted">Nothing brewing yet.</p>
      ) : (
        <ul className="plain-rows">
          {sorted.map((a) => (
            <li key={a.id} id={`post-${a.id}`}>
              <div className={`plain-row${a.id === target ? ' wire-target' : ''}`}>
                <div className="row-top">
                  <p className="announcement-title">{a.title}</p>
                  {isAdmin && (
                    <button
                      type="button"
                      className={`link mut small${armed === a.id ? ' armed' : ''}`}
                      onClick={() => remove(a.id)}
                      disabled={busy === a.id}
                    >
                      {busy === a.id ? 'Deleting…' : armed === a.id ? 'Tap again to delete' : 'Delete'}
                    </button>
                  )}
                </div>
                {a.body && <p className="announcement-text">{a.body}</p>}
                <p className="row-meta">{stamp(a.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
