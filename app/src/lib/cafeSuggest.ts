// Suggestions for the name/city/neighbourhood combo fields in the visit and wishlist-add
// forms. Pure, no imports (tested in supabase/tests/cafe_suggest.test.mjs).

export type KnownPlace = { city: string; area: string }

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Cafes whose name contains the query (case/space-insensitive), a handful at most. */
export function nameMatches<T extends { name: string }>(cafes: T[], query: string, max = 3): T[] {
  const q = norm(query)
  if (!q) return []
  return cafes.filter((c) => norm(c.name).includes(q)).slice(0, max)
}

/** Distinct cities containing the query, alphabetical. Blank query suggests nothing (type to see any). */
export function cityMatches(cafes: KnownPlace[], query: string, max = 5): string[] {
  const q = norm(query)
  if (!q) return []
  const cities = [...new Set(cafes.map((c) => c.city).filter(Boolean))].sort()
  return cities.filter((c) => norm(c).includes(q)).slice(0, max)
}

/** Distinct neighbourhoods containing the query, within `city` when one is filled in, alphabetical. */
export function areaMatches(cafes: KnownPlace[], city: string, query: string, max = 5): string[] {
  const q = norm(query)
  if (!q) return []
  const scoped = city.trim() ? cafes.filter((c) => norm(c.city) === norm(city)) : cafes
  const areas = [...new Set(scoped.map((c) => c.area).filter(Boolean))].sort()
  return areas.filter((a) => norm(a).includes(q)).slice(0, max)
}
