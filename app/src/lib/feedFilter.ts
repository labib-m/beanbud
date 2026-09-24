// Search, city filter, preset chips and sorting over EVERYONE's visits (the Feed's "global" view).
// Pure, and the only import is the shared rules (tested in supabase/tests/feed_filter.test.mjs).
import { matchesSearch, matchesVisit, type Features, type Selected, type Sort } from './filters.ts'

export type FeedRow = Features & {
  id: string
  cafeId: string
  cafeName: string
  city: string
  area: string
  visitedOn: string
  createdAt: string
  overall: number | null
  who: string                  // the person's name and @handle, so their entries can be searched too
  publicNote: string | null
}

export type FeedQuery = { q: string; city: string; area?: string; sel: Selected; sort: Sort }

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
const byRecent = (a: FeedRow, b: FeedRow) =>
  b.visitedOn.localeCompare(a.visitedOn) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)

export function rowMatches(r: FeedRow, { q, city, area, sel }: Pick<FeedQuery, 'q' | 'city' | 'area' | 'sel'>): boolean {
  if (city && r.city !== city) return false
  if (area && r.area !== area) return false
  if (!matchesVisit(r, sel)) return false
  return matchesSearch(q, [r.cafeName, r.area, r.city, ...r.drinks, r.publicNote, r.who])
}

/** Filter, then sort. "Most visited" means the cafes with the most visits by anyone (counted over all rows given). */
export function filterAndSort(rows: FeedRow[], query: FeedQuery): FeedRow[] {
  const perCafe = new Map<string, number>()
  for (const r of rows) perCafe.set(r.cafeId, (perCafe.get(r.cafeId) ?? 0) + 1)

  const out = rows.filter((r) => rowMatches(r, query))
  switch (query.sort) {
    case 'score':
      return out.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1) || byRecent(a, b))
    case 'visits':
      return out.sort((a, b) => (perCafe.get(b.cafeId) ?? 0) - (perCafe.get(a.cafeId) ?? 0) || byRecent(a, b))
    case 'name':
      return out.sort((a, b) => collator.compare(a.cafeName, b.cafeName) || byRecent(a, b))
    default:
      return out.sort(byRecent)
  }
}

/** The cities that appear, for the city menu. */
export const citiesOf = (rows: FeedRow[]): string[] =>
  [...new Set(rows.map((r) => r.city).filter(Boolean))].sort((a, b) => collator.compare(a, b))

/** The neighbourhoods that appear, for the neighbourhood menu; within one city when a city is chosen. */
export const areasOf = (rows: FeedRow[], city = ''): string[] =>
  [...new Set(rows.filter((r) => !city || r.city === city).map((r) => r.area).filter(Boolean))].sort((a, b) => collator.compare(a, b))

/** specv2 §8.4.5: "you agree" within 0.25 of each other, otherwise who rated it higher. */
export function compareLabel(mine: number, theirs: number): string {
  const diff = mine - theirs
  if (Math.abs(diff) < 0.25) return 'you agree'
  return diff > 0 ? 'you liked it more' : 'they liked it more'
}
