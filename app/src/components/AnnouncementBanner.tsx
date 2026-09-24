import { useEffect, useState } from 'react'
import { fetchAnnouncements } from '../data/announcements'
import { nextToShow } from '../lib/announcements'
import type { Announcement } from '../lib/types'

const DISMISSED_KEY = 'bb-dismissed-announcements'

function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') } catch { return [] }
}
function rememberDismissed(id: string) {
  try {
    const cur = readDismissed()
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...cur, id].slice(-50)))
  } catch { /* private mode: it'll just show again next time, not worth failing over */ }
}

/**
 * An "RSS-style" feed of developer announcements, not a third option beside Activity/Directory:
 * just the newest one not yet dismissed on this device, as a banner above them. Dismissing one
 * only hides that one, here, on this device — a new announcement, or the same one on another
 * device, still shows.
 */
export function AnnouncementBanner() {
  const [list, setList] = useState<Announcement[] | null>(null)
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readDismissed())

  useEffect(() => {
    fetchAnnouncements().then(setList).catch(() => setList([]))
  }, [])

  const next = list ? nextToShow(list, dismissedIds) : null
  if (!next) return null

  function onDismiss() {
    rememberDismissed(next!.id)
    setDismissedIds((cur) => [...cur, next!.id])
  }

  return (
    <div className="announcement-banner" role="status">
      <div className="announcement-body">
        <p className="announcement-title">{next.title}</p>
        {next.body && <p className="announcement-text">{next.body}</p>}
      </div>
      <button type="button" className="announcement-dismiss" aria-label="Dismiss this announcement" onClick={onDismiss}>×</button>
    </div>
  )
}
