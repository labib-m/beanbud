import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteSupportMessage, fetchSupportMessages } from '../data/support'
import type { SupportMessage } from '../lib/types'
import { PersonLink } from './PersonLink'

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Admin only (the caller checks isAdmin): messages people sent through You -> Contact. */
export function SupportInbox() {
  const [list, setList] = useState<SupportMessage[] | null>(null)
  const [err, setErr] = useState('')
  const [params] = useSearchParams()
  const [open, setOpen] = useState(() => params.get('inbox') === '1')
  const [armed, setArmed] = useState<string | null>(null)

  useEffect(() => {
    fetchSupportMessages().then(setList).catch((e: Error) => setErr(e.message))
  }, [])

  async function remove(id: string) {
    if (armed !== id) { setArmed(id); return }
    try {
      await deleteSupportMessage(id)
      setList((cur) => (cur ?? []).filter((m) => m.id !== id))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete.')
    } finally {
      setArmed(null)
    }
  }

  return (
    <div className="inbox">
      <button type="button" className="expander" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>Inbox{list ? ` · ${list.length}` : ''}</span>
        <span className="caret" aria-hidden="true">{open ? '︿' : '﹀'}</span>
      </button>
      {err && <p className="error small" role="alert">{err}</p>}
      {open && list && list.length === 0 && <p className="muted">No messages yet.</p>}
      {open && list && list.length > 0 && (
        <ul className="plain-rows">
          {list.map((m) => (
            <li key={m.id}>
              <div className="plain-row">
                <div className="row-top">
                  <span className="feed-who-text">
                    {m.user_id ? <PersonLink id={m.user_id} profile={m.profiles} handle /> : <b>Someone</b>}
                  </span>
                  <button type="button" className={`link mut small${armed === m.id ? ' armed' : ''}`} onClick={() => remove(m.id)}>
                    {armed === m.id ? 'Tap again to delete' : 'Delete'}
                  </button>
                </div>
                <p className="note-quote">{m.body}</p>
                <p className="row-meta">{stamp(m.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
