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
