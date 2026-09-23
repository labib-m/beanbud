// The A-Z cafe directory: search, sort and group. Pure, no imports (tested in
// supabase/tests/directory.test.mjs).

export type DirectoryCafe = { id: string; name: string; city: string; area: string }
export type DirectoryGroup = { letter: string; cafes: DirectoryCafe[] }

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

/** The heading a cafe files under: its first letter (accents ignored, so "Élan" is under E), or # for anything else. */
export function letterOf(name: string): string {
  const first = name.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0)
  return /\p{L}/u.test(first) ? first.toLocaleUpperCase('en') : '#'
}

export function matchesQuery(c: DirectoryCafe, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.name, c.area, c.city].join(' ').toLowerCase().includes(q)
}

/** Alphabetical (case and accents ignored), filtered by the search text, grouped under letters; # goes last. */
export function groupAlphabetically(cafes: DirectoryCafe[], query = ''): DirectoryGroup[] {
  const sorted = cafes
    .filter((c) => matchesQuery(c, query))
    .sort((a, b) => collator.compare(a.name.trim(), b.name.trim()) || collator.compare(a.area, b.area) || a.id.localeCompare(b.id))
  const groups: DirectoryGroup[] = []
  for (const c of sorted) {
    const letter = letterOf(c.name)
    const last = groups[groups.length - 1]
    if (last && last.letter === letter) last.cafes.push(c)
    else groups.push({ letter, cafes: [c] })
  }
  // A group is created when the letter changes; symbols sort before letters, so move # to the end.
  const hash = groups.filter((g) => g.letter === '#')
  return [...groups.filter((g) => g.letter !== '#'), ...hash]
}

// ---------------------------------------------------------------------------------------
// specv2 §8.4.6: the Directory's rating leaderboard (Most people / Top rated). "A–Z" keeps
// the plain alphabetical list above, unchanged, as a third option.

export type DirectoryVisit = { cafe_id: string; user_id: string; overall: number | null }
export type DirectoryPerson = { userId: string; name: string; average: number; isMe: boolean }
export type RatedCafe = DirectoryCafe & { average: number; peopleCount: number; people: DirectoryPerson[] }

/**
 * One row per cafe with at least one visit: the group average (the mean of each PERSON's own
 * average there, not a flat mean of every visit — so one person logging five so-so visits
 * doesn't outweigh someone else's one great one), and everyone who's visited with their own
 * average. `nameOf` resolves a user id to a display name (Profile display_name/handle).
 */
export function rateCafes(cafes: DirectoryCafe[], visits: DirectoryVisit[], me: string, nameOf: (userId: string) => string): RatedCafe[] {
  const byCafe = new Map<string, Map<string, number[]>>()
  for (const v of visits) {
    if (v.overall == null) continue
    const byPerson = byCafe.get(v.cafe_id) ?? new Map<string, number[]>()
    const scores = byPerson.get(v.user_id) ?? []
    scores.push(Number(v.overall))
    byPerson.set(v.user_id, scores)
    byCafe.set(v.cafe_id, byPerson)
  }
  const out: RatedCafe[] = []
  for (const cafe of cafes) {
    const byPerson = byCafe.get(cafe.id)
    if (!byPerson || byPerson.size === 0) continue
    const people: DirectoryPerson[] = [...byPerson.entries()].map(([userId, scores]) => ({
      userId, name: userId === me ? 'You' : nameOf(userId), average: mean(scores), isMe: userId === me,
    }))
    const mine = people.find((p) => p.isMe)
    // Everyone else, most rated visits first, then by name; "You" (if present) always leads.
    const rest = people.filter((p) => !p.isMe).sort((a, b) => byPerson.get(b.userId)!.length - byPerson.get(a.userId)!.length || a.name.localeCompare(b.name))
    const ordered = mine ? [mine, ...rest] : rest
    out.push({ ...cafe, average: mean(ordered.map((p) => p.average)), peopleCount: ordered.length, people: ordered })
  }
  return out
}

function mean(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}

export type DirectorySort = 'people' | 'rating'

/** Default: most people, then highest average. "Top rated": highest average, then most people. Both then A–Z. */
export function sortRatedCafes(cafes: RatedCafe[], sort: DirectorySort): RatedCafe[] {
  const arr = [...cafes]
  const byName = (a: RatedCafe, b: RatedCafe) => collator.compare(a.name.trim(), b.name.trim())
  if (sort === 'rating') return arr.sort((a, b) => b.average - a.average || b.peopleCount - a.peopleCount || byName(a, b))
  return arr.sort((a, b) => b.peopleCount - a.peopleCount || b.average - a.average || byName(a, b))
}
