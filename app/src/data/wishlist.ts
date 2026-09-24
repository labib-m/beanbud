import { supabase } from '../lib/supabase'
import type { WishlistItem } from '../lib/types'

function friendly(e: { code?: string; message: string }): Error {
  if (e.code === '42P01' || e.code === 'PGRST205') return new Error("The wishlist isn't set up yet. Try again later.")
  return new Error(e.message)
}

/** Your bookmarked cafes, newest first. Only ever your own: the database hides everyone else's. */
export async function fetchWishlist(): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist')
    .select('cafe_id, created_at, cafes(id, name, city, area)')
    .order('created_at', { ascending: false })
  if (error) throw friendly(error)
  return data as unknown as WishlistItem[]
}

export async function isBookmarked(cafeId: string): Promise<boolean> {
  const { data, error } = await supabase.from('wishlist').select('cafe_id').eq('cafe_id', cafeId).limit(1)
  if (error) throw friendly(error)
  return data.length > 0
}

export async function addBookmark(cafeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').insert({ cafe_id: cafeId })
  if (error && error.code !== '23505') throw friendly(error) // 23505: already bookmarked, which is fine
}

export async function removeBookmark(cafeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').delete().eq('cafe_id', cafeId)
  if (error) throw friendly(error)
}
