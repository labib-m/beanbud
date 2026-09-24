// What a cafe's public page shows, worked out from the visits people have logged there.
// Pure; the only import is a type (tested in supabase/tests/cafe_info.test.mjs).

import type { ScoreKey, VisitDetail } from './types.ts'

export type CafeVisit = VisitDetail & {
  profiles: { display_name: string | null; handle: string | null; avatar?: string | null } | null
}

type Who = CafeVisit['profiles']

export function newestFirst(visits: CafeVisit[]): CafeVisit[] {
  return [...visits].sort((a, b) => b.visited_on.localeCompare(a.visited_on) || b.created_at.localeCompare(a.created_at))
}

export type DrinkEntry = {
  drink: string
  price: number | null
  score: number | null
  currency: string | null
  userId: string
  who: Who
  visitedOn: string
  visit: CafeVisit   // the whole visit it belongs to, for its details
}

/** The latest `n` drinks anyone had here, newest visit first, in the order listed within a visit. */
export function recentDrinkEntries(visits: CafeVisit[], n = 5): DrinkEntry[] {
  const out: DrinkEntry[] = []
  for (const v of newestFirst(visits)) {
    for (const d of [...v.visit_drinks].sort((a, b) => a.sort_order - b.sort_order)) {
      out.push({
        drink: d.drink_type, price: d.price == null ? null : Number(d.price), score: d.score, currency: v.currency,
        userId: v.user_id, who: v.profiles, visitedOn: v.visited_on, visit: v,
      })
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

export type CriterionAverage = { key: ScoreKey; average: number; count: number }
type ScoreRow = Partial<Record<`score_${ScoreKey}`, number | string | null>>

const CRITERIA: ScoreKey[] = ['ambiance', 'drinks', 'food', 'service', 'crowd']

/**
 * The average of each rating category across everyone's visits to a cafe. A category nobody
 * rated is left out of its own average (count 0, average 0), so it neither helps nor hurts.
 */
export function criteriaAverages(rows: ScoreRow[]): CriterionAverage[] {
  return CRITERIA.map((key) => {
    const rated = rows.map((r) => Number(r[`score_${key}`])).filter((n) => Number.isFinite(n) && n > 0)
    return { key, average: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0, count: rated.length }
  })
}
