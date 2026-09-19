// "Most recent" summaries for a profile. Pure functions with no imports, so they can be
// tested on their own (see supabase/tests/recent.test.mjs).

export type RecentVisit = {
  id: string
  cafe_id: string
  visited_on: string // YYYY-MM-DD
  created_at: string
  overall: number | null
  cafes: { name: string; city: string; area: string }
  visit_drinks: { drink_type: string; score: number | null; sort_order: number }[]
}

export type RecentCafe = {
  cafeId: string
  name: string
  area: string
  city: string
  lastVisit: string
  overall: number | null // the rating from that most recent visit
}

export type RecentDrink = {
  drink: string
  cafeId: string
  cafeName: string
  visitedOn: string
  score: number | null
}

/** Newest first: by visit date, then by when it was logged. Does not change the input. */
export function newestFirst(visits: RecentVisit[]): RecentVisit[] {
  return [...visits].sort(
    (a, b) => b.visited_on.localeCompare(a.visited_on) || b.created_at.localeCompare(a.created_at),
  )
}

/** The `n` most recently visited DIFFERENT cafes. */
export function recentCafes(visits: RecentVisit[], n = 3): RecentCafe[] {
  const seen = new Set<string>()
  const out: RecentCafe[] = []
  for (const v of newestFirst(visits)) {
    if (seen.has(v.cafe_id)) continue
    seen.add(v.cafe_id)
    out.push({
      cafeId: v.cafe_id,
      name: v.cafes.name,
      area: v.cafes.area,
      city: v.cafes.city,
      lastVisit: v.visited_on,
      overall: v.overall == null ? null : Number(v.overall),
    })
    if (out.length === n) break
  }
  return out
}

/** The `n` most recently logged drinks, newest visit first, in the order they were listed within a visit. */
export function recentDrinks(visits: RecentVisit[], n = 3): RecentDrink[] {
  const out: RecentDrink[] = []
  for (const v of newestFirst(visits)) {
    const drinks = [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order)
    for (const d of drinks) {
      out.push({ drink: d.drink_type, cafeId: v.cafe_id, cafeName: v.cafes.name, visitedOn: v.visited_on, score: d.score })
      if (out.length === n) return out
    }
  }
  return out
}
