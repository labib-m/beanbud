import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWishlist, removeBookmark } from '../data/wishlist'
import { stillToTry } from '../lib/wishlist'
import type { WishlistItem } from '../lib/types'

/** The cafes you've bookmarked to try. A cafe drops off once you've logged a visit there. */
export function WishlistSection({ visitedCafeIds }: { visitedCafeIds: string[] }) {
  const [items, setItems] = useState<WishlistItem[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetchWishlist().then(setItems).catch((e: Error) => setErr(e.message))
  }, [])

  const shown = useMemo(() => stillToTry(items ?? [], visitedCafeIds), [items, visitedCafeIds])

  async function remove(cafeId: string) {
    try {
      await removeBookmark(cafeId)
      setItems((cur) => (cur ?? []).filter((i) => i.cafe_id !== cafeId))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update your wishlist.')
    }
  }

  return (
    <section className="section">
      <span className="section-label">Wishlist</span>
      {err && <p className="error small" role="alert">{err}</p>}
      {items && shown.length === 0 && <p className="muted">Nothing on your wishlist. Tap "Want to try" on any cafe's page to save it here.</p>}
      {shown.length > 0 && (
        <ul className="plain-rows">
          {shown.map((i) => (
            <li key={i.cafe_id}>
              <div className="plain-row wish-row">
                <Link className="wish-main" to={`/cafes/${i.cafe_id}`}>
                  <h2 className="row-name">{i.cafes.name}</h2>
                  <p className="row-meta">{[i.cafes.area, i.cafes.city].filter(Boolean).join(', ')}</p>
                </Link>
                <button type="button" className="link mut small" aria-label={`Remove ${i.cafes.name} from your wishlist`} onClick={() => remove(i.cafe_id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
