// What a cafe's public page shows, worked out from the visits people have logged there.
// Pure, no imports (tested in supabase/tests/cafe_info.test.mjs).

export type CafeVisit = {
  id: string
  user_id: string
  visited_on: string
  created_at: string
  overall: number | null
  public_note: string | null
  profiles: { display_name: string | null; handle: string | null; avatar?: string | null } | null
  visit_drinks: { drink_type: string; score: number | null; sort_order: number }[]
}

type Who = CafeVisit['profiles']

export function newestFirst(visits: CafeVisit[]): CafeVisit[] {
  return [...visits].sort((a, b) => b.visited_on.localeCompare(a.visited_on) || b.created_at.localeCompare(a.created_at))
}

/** The latest visits by anyone. */
export function recentLogs(visits: CafeVisit[], n = 5): CafeVisit[] {
  return newestFirst(visits).slice(0, n)
}

export type DrinkReview = { drink: string; score: number; userId: string; who: Who; visitedOn: string }

/** The latest drinks that someone actually rated (an unrated drink is not a review). */
export function drinkReviews(visits: CafeVisit[], n = 5): DrinkReview[] {
  const out: DrinkReview[] = []
  for (const v of newestFirst(visits)) {
    for (const d of [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order)) {
      if (d.score == null) continue
      out.push({ drink: d.drink_type, score: d.score, userId: v.user_id, who: v.profiles, visitedOn: v.visited_on })
      if (out.length === n) return out
    }
  }
  return out
}

export type PublicNote = { note: string; userId: string; who: Who; visitedOn: string }

/** The latest notes people chose to share (a blank note is not shared). */
export function publicNotes(visits: CafeVisit[], n = 5): PublicNote[] {
  const out: PublicNote[] = []
  for (const v of newestFirst(visits)) {
    const note = (v.public_note ?? '').trim()
    if (!note) continue
    out.push({ note, userId: v.user_id, who: v.profiles, visitedOn: v.visited_on })
    if (out.length === n) break
  }
  return out
}

export const visitorCount = (visits: CafeVisit[]) => new Set(visits.map((v) => v.user_id)).size

export type FriendAt = { userId: string; who: Who; visits: number; average: number }

/**
 * Specv2 §8.2.3 "Friends here": everyone but `me` who has visited, with their visit count and
 * their own average overall at this cafe (0 when they never rated it). Most visits first, then
 * by name, for a stable order.
 */
export function friendsAt(visits: CafeVisit[], me: string): FriendAt[] {
  const m = new Map<string, { who: Who; overalls: number[]; n: number }>()
  for (const v of visits) {
    if (v.user_id === me) continue
    const e = m.get(v.user_id) ?? { who: v.profiles, overalls: [], n: 0 }
    e.n++
    if (v.overall != null) e.overalls.push(Number(v.overall))
    m.set(v.user_id, e)
  }
  return [...m.entries()]
    .map(([userId, e]) => ({
      userId, who: e.who, visits: e.n,
      average: e.overalls.length ? e.overalls.reduce((a, b) => a + b, 0) / e.overalls.length : 0,
    }))
    .sort((a, b) => b.visits - a.visits || (a.who?.display_name ?? '').localeCompare(b.who?.display_name ?? ''))
}

export type CafeRating = { average: number; count: number }

/**
 * A cafe's overall rating: the average of every rated visit's overall score, from every person.
 * (A visit's own overall is the average of the criteria its author rated.) Visits nobody rated
 * are left out, so they neither help nor hurt. Returns average 0 and count 0 when nothing is rated.
 */
export function cafeRating(overalls: (number | string | null | undefined)[]): CafeRating {
  const rated = overalls.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  if (!rated.length) return { average: 0, count: 0 }
  return { average: rated.reduce((a, b) => a + b, 0) / rated.length, count: rated.length }
}
