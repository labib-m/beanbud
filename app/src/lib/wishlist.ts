// Which bookmarked cafes still belong on the wishlist. Pure, no imports
// (tested in supabase/tests/wishlist.test.mjs).

/** Bookmarks for cafes you haven't been to yet, in the order given (newest first). Once you log a visit there, it drops off the list. */
export function stillToTry<T extends { cafe_id: string }>(items: T[], visitedCafeIds: Iterable<string>): T[] {
  const visited = new Set(visitedCafeIds)
  return items.filter((i) => !visited.has(i.cafe_id))
}
