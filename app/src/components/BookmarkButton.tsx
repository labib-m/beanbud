import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { addBookmark, isBookmarked, removeBookmark } from '../data/wishlist'

/** "Want to try": adds or removes this cafe on YOUR OWN wishlist (shown on You, and on your profile). */
export function BookmarkButton({ cafeId }: { cafeId: string }) {
  const { session } = useAuth()
  const me = session!.user.id
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    isBookmarked(cafeId, me).then((v) => alive && setSaved(v)).catch((e: Error) => alive && setErr(e.message))
    return () => { alive = false }
  }, [cafeId, me])

  async function toggle() {
    if (saved === null || busy) return
    setErr('')
    setBusy(true)
    try {
      if (saved) await removeBookmark(cafeId)
      else await addBookmark(cafeId)
      setSaved(!saved)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update your wishlist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={`btn ghost bookmark${saved ? ' on' : ''}`} aria-pressed={saved === true} onClick={toggle} disabled={saved === null || busy}>
        <svg width="12" height="15" viewBox="0 0 12 15" aria-hidden="true">
          <path d="M1.5 1.5h9v12L6 10.2 1.5 13.5z" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {saved ? 'On your wishlist' : 'Want to try'}
      </button>
      {err && <p className="error small" role="alert">{err}</p>}
    </>
  )
}
