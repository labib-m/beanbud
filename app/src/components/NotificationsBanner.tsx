import { useEffect, useState } from 'react'
import { currentPushStatus, enablePush, type PushStatus } from '../lib/push'
import { NEW_USER_NOTIF_KEY, shouldShowNotifBanner } from '../lib/notifBanner'

/**
 * A floating banner, on every page, nudging a new account to turn notifications on — shown
 * until they do. SignIn.tsx sets NEW_USER_NOTIF_KEY right after a sign-up; this clears it only
 * once push is confirmed on, so the banner can reappear later too (e.g. it can't do anything
 * on an unsupported plain Safari tab, but comes back once that same account opens the Home
 * Screen icon, where push becomes possible). Never shown to an existing user signing in.
 */
function isNewUser(): boolean {
  try {
    return localStorage.getItem(NEW_USER_NOTIF_KEY) === '1'
  } catch {
    return false // private browsing or storage blocked: nothing to show
  }
}

export function NotificationsBanner() {
  const [status, setStatus] = useState<PushStatus | 'checking'>('checking')
  const [newUser] = useState(isNewUser)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!newUser) return
    currentPushStatus().then(setStatus).catch(() => setStatus('unsupported'))
  }, [newUser])

  async function turnOn() {
    setErr('')
    setBusy(true)
    try {
      const next = await enablePush()
      setStatus(next)
      if (next === 'on') {
        try { localStorage.removeItem(NEW_USER_NOTIF_KEY) } catch { /* worst case it just asks again next time */ }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn on notifications.")
    } finally {
      setBusy(false)
    }
  }

  if (!shouldShowNotifBanner(newUser, status)) return null

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
