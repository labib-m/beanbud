import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { deleteAnnouncement, fetchAnnouncements } from './announcements'
import { fetchMyProfile } from './social'
import { sortNewest, unreadCount as countUnread } from '../lib/announcements'
import type { Announcement } from '../lib/types'

const SEEN_KEY = 'bb-wire-lastseen'
function readLastSeen(): string | null {
  try { return localStorage.getItem(SEEN_KEY) } catch { return null }
}
function writeLastSeen(id: string) {
  try { localStorage.setItem(SEEN_KEY, id) } catch { /* private mode: the badge just reappears next time */ }
}

type Ctx = {
  list: Announcement[]
  isAdmin: boolean
  unreadCount: number
  latestUnread: Announcement | null
  markSeen: (id: string) => void
  markAllSeen: () => void
  removeAnnouncement: (id: string) => Promise<void>
}

const BrewWireContext = createContext<Ctx | null>(null)

/**
 * One shared fetch of Brew Wire posts (and whether you're the admin) for the whole app, so the
 * floating banner, the tab badge and the Feed tab all agree on what's unread. "Seen" is tracked
 * per device by the id of the newest post you've looked at — see lib/announcements.ts.
 */
export function BrewWireProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const me = session?.user.id
  const [list, setList] = useState<Announcement[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(() => readLastSeen())

  useEffect(() => {
    if (!me) return
    fetchAnnouncements().then(setList).catch(() => {})
    fetchMyProfile(me).then((p) => setIsAdmin(p?.is_admin === true)).catch(() => {})
  }, [me])

  function markSeen(id: string) {
    writeLastSeen(id)
    setLastSeen(id)
  }
  function markAllSeen() {
    const newest = sortNewest(list)[0]
    if (newest) markSeen(newest.id)
  }
  async function removeAnnouncement(id: string) {
    await deleteAnnouncement(id)
    setList((cur) => cur.filter((a) => a.id !== id))
  }

  const sorted = sortNewest(list)
  const unread = countUnread(list, lastSeen)
  const latestUnread = unread > 0 ? sorted[0] : null

  return (
    <BrewWireContext.Provider value={{ list, isAdmin, unreadCount: unread, latestUnread, markSeen, markAllSeen, removeAnnouncement }}>
      {children}
    </BrewWireContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrewWire() {
  const ctx = useContext(BrewWireContext)
  if (!ctx) throw new Error('useBrewWire must be used inside <BrewWireProvider>')
  return ctx
}
