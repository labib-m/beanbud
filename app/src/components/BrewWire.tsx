import type { Announcement } from '../lib/types'
import { sortNewest } from '../lib/announcements'

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Every developer announcement, newest first — the third tab in Feed. */
export function BrewWire({ list }: { list: Announcement[] }) {
  const sorted = sortNewest(list)
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
                <p className="announcement-title">{a.title}</p>
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
