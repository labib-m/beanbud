import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddCafeForm } from './AddCafeForm'
import { Stars } from './Stars'
import { fetchLiteVisits } from '../data/social'
import { fetchWishlist, removeBookmark } from '../data/wishlist'
import { cafeRating } from '../lib/cafeInfo'
import { stillToTry } from '../lib/wishlist'
import type { WishlistItem } from '../lib/types'

function WishlistCard({ item, average, onRemove }: { item: WishlistItem; average: number; onRemove?: () => void }) {
  return (
    <div className="wish-card">
      <div className="row-top">
        <Link className="name-link" to={`/cafes/${item.cafe_id}`}><h2 className="row-name">{item.cafes.name}</h2></Link>
        {average > 0
          ? <span className="row-rating"><b>{average.toFixed(1)}</b><Stars value={average} size={14} /></span>
          : <span className="muted small">No ratings yet</span>}
      </div>
      <div className="wish-card-bottom">
        <p className="row-meta">{[item.cafes.area, item.cafes.city].filter(Boolean).join(', ')}</p>
        {onRemove && <button type="button" className="wish-remove" aria-label={`Remove ${item.cafes.name} from your wishlist`} onClick={onRemove}>×</button>}
      </div>
      {item.cafes.map_url && <a className="text-link" href={item.cafes.map_url} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a>}
    </div>
  )
}

/**
 * The cafes on someone's wishlist, as cards. `own` shows the "+ Add a cafe" button and lets
 * each card be removed; without it, the list is read-only (another person's wishlist, on
 * their profile). A cafe drops off once its owner has logged a visit there.
 */
export function WishlistCards({ userId, visitedCafeIds, own = false }: { userId: string; visitedCafeIds: string[]; own?: boolean }) {
  const [items, setItems] = useState<WishlistItem[] | null>(null)
  const [averages, setAverages] = useState<Map<string, number>>(new Map())
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)

  function load() {
    fetchWishlist(userId).then(setItems).catch((e: Error) => setErr(e.message))
    fetchLiteVisits().then((visits) => {
      const byCafe = new Map<string, (number | null)[]>()
      for (const v of visits) byCafe.set(v.cafe_id, [...(byCafe.get(v.cafe_id) ?? []), v.overall])
      setAverages(new Map([...byCafe].map(([id, overalls]) => [id, cafeRating(overalls).average])))
    }).catch(() => {})
  }
  useEffect(load, [userId])

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
    <>
      {own && <button type="button" className="btn ghost" onClick={() => setAdding(true)}>+ Add a cafe</button>}
      {own && adding && <AddCafeForm onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load() }} />}
      {err && <p className="error small" role="alert">{err}</p>}
      {items && shown.length === 0 && (
        <p className="muted">
          {own ? 'Nothing on your wishlist. Tap "Want to try" on any cafe\'s page, or add one above.' : 'Nothing on their wishlist yet.'}
        </p>
      )}
      {shown.length > 0 && (
        <div className="wish-cards">
          {shown.map((i) => (
            <WishlistCard key={i.cafe_id} item={i} average={averages.get(i.cafe_id) ?? 0} onRemove={own ? () => remove(i.cafe_id) : undefined} />
          ))}
        </div>
      )}
    </>
  )
}

/** The Wishlist section, under a section label: your own on You (editable), or someone else's on their profile (read-only). */
export function WishlistSection({ userId, visitedCafeIds, own = false }: { userId: string; visitedCafeIds: string[]; own?: boolean }) {
  return (
    <section className="section">
      <span className="section-label">Wishlist</span>
      <WishlistCards userId={userId} visitedCafeIds={visitedCafeIds} own={own} />
    </section>
  )
}
