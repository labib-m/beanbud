import { useState } from 'react'
import { sendSupportMessage } from '../data/support'

/** You -> Contact and Brew Wire -> Message the developer: a plain message to the developer. Only the admin can read what's sent. */
export function ContactForm({ onDone, doneLabel = 'Back to You' }: { onDone: () => void; doneLabel?: string }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  async function send() {
    setErr('')
    if (!text.trim()) { setErr('Write something first.'); return }
    setBusy(true)
    try {
      await sendSupportMessage(text)
      setSent(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="stack">
        <p className="contact-blurb">Thanks. Your message is on its way to the developer.</p>
        <button type="button" className="btn ghost" onClick={onDone}>{doneLabel}</button>
      </div>
    )
  }

  return (
    <div className="stack">
      <p className="contact-blurb">Drop a message to the developer to report any bugs, request features, provide feedback.</p>
      {err && <p className="error small" role="alert">{err}</p>}
      <textarea
        className="input sm area" aria-label="Message to the developer" placeholder="Type your message"
        maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
      />
      <div className="row-btns">
        <button type="button" className="btn primary" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>
        <button type="button" className="btn ghost" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}
