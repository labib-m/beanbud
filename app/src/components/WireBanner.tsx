import { Link } from 'react-router-dom'
import { useBrewWire } from '../data/BrewWireProvider'

/**
 * A floating banner, on every page, showing the latest Brew Wire post nobody has seen yet.
 * Tapping it opens that post in Brew Wire (which also marks everything as read); the × marks it
 * (and everything older) as seen without opening it. Same "seen" state as the tab badges.
 */
export function WireBanner() {
  const { latestUnread, markSeen } = useBrewWire()
  if (!latestUnread) return null

  return (
    <div className="wire-banner" role="status">
      <Link className="wire-banner-body" to={`/feed?tab=wire&post=${latestUnread.id}`}>
        <p className="wire-banner-title">☕ {latestUnread.title}</p>
        {latestUnread.body && <p className="wire-banner-text">{latestUnread.body}</p>}
      </Link>
      <button type="button" className="wire-banner-dismiss" aria-label="Mark as read" onClick={() => markSeen(latestUnread.id)}>×</button>
    </div>
  )
}
