import { supabase } from '../lib/supabase'
import type { WishlistItem } from '../lib/types'

function friendly(e: { code?: string; message: string }): Error {
  if (e.code === '42P01' || e.code === 'PGRST205') return new Error("The wishlist isn't set up yet. Try again later.")
  return new Error(e.message)
}

/** One person's bookmarked cafes, newest first. Everyone signed in can read any wishlist (shown on profiles); only its owner can change it. */
export async function fetchWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist')
    .select('cafe_id, created_at, cafes(id, name, city, area, map_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw friendly(error)
  return data as unknown as WishlistItem[]
}

/** Is this cafe on YOUR OWN wishlist (userId = you)? */
export async function isBookmarked(cafeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('wishlist').select('cafe_id').eq('cafe_id', cafeId).eq('user_id', userId).limit(1)
  if (error) throw friendly(error)
  return data.length > 0
}

/** Bookmarks the cafe for you. The database fills in user_id as whoever is signed in; RLS blocks bookmarking for anyone else. */
export async function addBookmark(cafeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').insert({ cafe_id: cafeId })
  if (error && error.code !== '23505') throw friendly(error) // 23505: already bookmarked, which is fine
}

/** Removes YOUR OWN bookmark for this cafe. RLS only ever lets you delete your own row, whatever this query asks for. */
export async function removeBookmark(cafeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').delete().eq('cafe_id', cafeId)
  if (error) throw friendly(error)
}
