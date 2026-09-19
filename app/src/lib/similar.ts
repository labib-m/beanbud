// "Did you mean...?": spot a cafe someone is about to create that may already exist, so visits stack
// under one cafe instead of being split across near-duplicates. Suggests only; never blocks.
// Pure, no imports (tested in supabase/tests/similar.test.mjs).

export type KnownCafe = { id: string; name: string; city: string; area: string; map_url?: string | null }
export type Similar<T extends KnownCafe = KnownCafe> = { cafe: T; reason: 'same-map-link' | 'similar-name' }

/** Lower-case, accents removed, everything except letters and digits dropped: "Dose-Espresso!" and "dose espresso" match. */
export function squash(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** A link in a comparable form: no protocol, no www, no #fragment, no trailing slash. */
export function squashLink(s: string): string {
  return s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/#.*$/, '').replace(/\/+$/, '')
}

const sameKey = (a: { name: string; city: string; area: string }, b: { name: string; city: string; area: string }) =>
  squash(a.name) === squash(b.name) && squash(a.city) === squash(b.city) && squash(a.area) === squash(b.area)

/**
 * Existing cafes that this new cafe may really be. Same map link is the strongest sign; then a very similar
 * name in the same city. A cafe with exactly the same name, city and neighbourhood is not a "similar" one:
 * it IS the existing cafe, and the form already selects it.
 */
export function similarCafes<T extends KnownCafe>(
  input: { name: string; city: string; area: string; mapUrl: string },
  known: T[],
  max = 3,
): Similar<T>[] {
  const name = squash(input.name)
  if (name.length < 3) return []
  const link = squashLink(input.mapUrl)
  const found: Similar<T>[] = []
  const seen = new Set<string>()
  const add = (cafe: T, reason: Similar['reason']) => {
    if (!seen.has(cafe.id)) { seen.add(cafe.id); found.push({ cafe, reason }) }
  }

  const others = known.filter((c) => !sameKey(c, input))
  if (link) for (const c of others) if (c.map_url && squashLink(c.map_url) === link) add(c, 'same-map-link')

  const city = squash(input.city)
  for (const c of others) {
    if (city && squash(c.city) !== city) continue
    const other = squash(c.name)
    if (!other) continue
    const [short, long] = name.length <= other.length ? [name, other] : [other, name]
    if (name === other || (short.length >= 4 && long.includes(short))) add(c, 'similar-name')
  }
  return found.slice(0, max)
}
