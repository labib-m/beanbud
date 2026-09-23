import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { currentPushStatus, enablePush, type PushStatus } from '../lib/push'
import { shouldShowNotifBanner } from '../lib/notifBanner'

/**
 * A floating banner, on every page, nudging anyone signed in to turn notifications on — shown
 * until they do. It rechecks the live status on every page navigation (Shell, which mounts
 * this once, never remounts on its own), so it also reacts to notifications being turned off
 * again later, or turned on elsewhere (e.g. the toggle on You). Hides itself where push isn't
 * possible at all (an unsupported browser, or a plain Safari tab on iOS before the person has
 * added the Home Screen icon).
 */
export function NotificationsBanner() {
  const location = useLocation()
  const [status, setStatus] = useState<PushStatus | 'checking'>('checking')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    currentPushStatus().then(setStatus).catch(() => setStatus('unsupported'))
  }, [location.pathname])

  async function turnOn() {
    setErr('')
    setBusy(true)
    try {
      setStatus(await enablePush())
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn on notifications.")
    } finally {
      setBusy(false)
    }
  }

  if (!shouldShowNotifBanner(status)) return null

  return (
    <div className="notif-banner" role="status">
      <p>
        {status === 'blocked'
          ? "Notifications are blocked. Turn them on in your phone's Settings for Bean Bud to hear about new visits."
          : "Turn on notifications so you don't miss when someone logs a new visit."}
        {err && <span className="notif-banner-err"> {err}</span>}
      </p>
      {status === 'off' && (
        <button className="notif-banner-btn" onClick={turnOn} disabled={busy}>{busy ? '…' : 'Turn on'}</button>
      )}
    </div>
  )
}
