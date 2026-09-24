import { useBrewWire } from '../data/BrewWireProvider'

/**
 * A floating banner, on every page, showing the latest Brew Wire post nobody has seen yet.
 * The × marks it (and everything older) as seen — the same "seen" state the Feed tab badge
 * and the TabBar badge read from, so dismissing it here clears those too.
 */
export function WireBanner() {
  const { latestUnread, markSeen } = useBrewWire()
  if (!latestUnread) return null

  return (
    <div className="wire-banner" role="status">
      <div className="wire-banner-body">
        <p className="wire-banner-title">☕ {latestUnread.title}</p>
        {latestUnread.body && <p className="wire-banner-text">{latestUnread.body}</p>}
      </div>
      <button type="button" className="wire-banner-dismiss" aria-label="Mark as read" onClick={() => markSeen(latestUnread.id)}>×</button>
    </div>
  )
}
