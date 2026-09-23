import { useState } from 'react'
import { isIOSDevice, NEW_SIGNUP_KEY, SEEN_KEY, shouldShowGuide } from '../lib/addToHomeScreen'

function isStandalone(): boolean {
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return window.matchMedia('(display-mode: standalone)').matches || navStandalone === true
}

/** Read once, when the component is first created: whether the guide should open. */
function initiallyOpen(): boolean {
  let justSignedUp = false
  let seen = false
  try {
    justSignedUp = localStorage.getItem(NEW_SIGNUP_KEY) === '1'
    seen = localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false // private browsing or storage blocked: skip the guide rather than risk a crash
  }
  return shouldShowGuide({ justSignedUp, seen, isIOS: isIOSDevice(navigator.userAgent, navigator.maxTouchPoints), isStandalone: isStandalone() })
}

/**
 * Shown once, right after someone on an iPhone or iPad creates an account (SignIn.tsx sets
 * NEW_SIGNUP_KEY on a successful sign-up), walking them through adding Bean Bud to their Home
 * Screen. Never shown to an existing user signing in, on Android/desktop, or a second time.
 */
export function AddToHomeScreenGuide() {
  const [open, setOpen] = useState(initiallyOpen)

  function dismiss() {
    setOpen(false)
    try {
      localStorage.setItem(SEEN_KEY, '1')
      localStorage.removeItem(NEW_SIGNUP_KEY)
    } catch {
      // Nothing saved: worst case they see the guide again next time. Not worth failing over.
    }
  }

  if (!open) return null

  return (
    <div className="overlay center-overlay" role="dialog" aria-modal="true" aria-label="Add Bean Bud to your Home Screen">
      <div className="dialog">
        <h2 className="sheet-title">Add Bean Bud to your Home Screen</h2>
        <p className="muted">
          You're all set. Add Bean Bud to your Home Screen and it opens full-screen, like a real app — it's also how
          you'll get notified when someone logs a new visit.
        </p>
        <ol className="a2hs-steps">
          <li><span className="a2hs-icon" aria-hidden="true">📤</span><span>Tap the <b>Share</b> button in Safari's toolbar.</span></li>
          <li><span className="a2hs-icon" aria-hidden="true">➕</span><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
          <li><span className="a2hs-icon" aria-hidden="true">✓</span><span>Tap <b>Add</b> in the top right.</span></li>
        </ol>
        <p className="muted small">
          The first time you open the new icon, it'll ask you to sign in again with your username and PIN — that's
          normal, all your visits are already saved.
        </p>
        <button className="btn primary" onClick={dismiss}>Got it</button>
      </div>
    </div>
  )
}
