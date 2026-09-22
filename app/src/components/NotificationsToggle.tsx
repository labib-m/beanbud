import { useEffect, useState } from 'react'
import { currentPushStatus, disablePush, enablePush, type PushStatus } from '../lib/push'

/** A row on You: turn push notifications on or off for this device. Hidden where unsupported. */
export function NotificationsToggle() {
  const [status, setStatus] = useState<PushStatus | 'checking'>('checking')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    currentPushStatus().then(setStatus).catch(() => setStatus('unsupported'))
  }, [])

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

  async function turnOff() {
    setErr('')
    setBusy(true)
    try {
      await disablePush()
      setStatus('off')
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn off notifications.")
    } finally {
      setBusy(false)
    }
  }

  if (status === 'unsupported') return null

  return (
    <div className="notif-row">
      <div>
        <span className="field-label">Notifications</span>
        <p className="muted small">
          {status === 'checking' && 'Checking…'}
          {status === 'on' && "On for this device — you'll hear about new visits other people log."}
          {status === 'off' && 'Get a notification when someone logs a new visit.'}
          {status === 'blocked' && "Blocked for this app. Turn it back on in your phone's notification settings."}
        </p>
        {err && <p className="error small">{err}</p>}
      </div>
      {status === 'on' && (
        <button className="btn ghost" onClick={turnOff} disabled={busy}>{busy ? '…' : 'Turn off'}</button>
      )}
      {status === 'off' && (
        <button className="btn ghost" onClick={turnOn} disabled={busy}>{busy ? '…' : 'Turn on'}</button>
      )}
    </div>
  )
}
