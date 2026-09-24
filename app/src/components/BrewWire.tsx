import { useState } from 'react'
import { useBrewWire } from '../data/BrewWireProvider'
import { sortNewest } from '../lib/announcements'

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Every developer announcement, newest first — the third tab in Feed. Delete is admin-only. */
export function BrewWire() {
  const { list, isAdmin, removeAnnouncement } = useBrewWire()
  const [armed, setArmed] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const sorted = sortNewest(list)

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
      <p className="people-sub">Straight from the roastery</p>
      {sorted.length === 0 ? (
        <p className="muted">Nothing brewing yet.</p>
      ) : (
        <ul className="plain-rows">
          {sorted.map((a) => (
            <li key={a.id}>
              <div className="plain-row">
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
