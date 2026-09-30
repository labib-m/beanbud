// The Google Maps Embed API URL for one cafe's location. Pure, no imports (tested in
// supabase/tests/map_embed.test.mjs). Uses "place" mode with a text query — the cafe's
// name plus its address (falling back to neighbourhood/city) — so no stored coordinates
// are needed; Google resolves the query to a place itself.

export type MappableCafe = { name: string; city: string; area: string; address: string | null }

/** What to search for: the cafe's name plus whatever location detail is on file. */
export function mapQuery(cafe: MappableCafe): string {
  const place = cafe.address?.trim() || [cafe.area, cafe.city].filter(Boolean).join(', ')
  return [cafe.name, place].filter(Boolean).join(', ')
}

/** The iframe src for the Google Maps Embed API, or null when there's no key configured. */
export function mapEmbedUrl(cafe: MappableCafe, apiKey: string | undefined): string | null {
  if (!apiKey) return null
  const q = mapQuery(cafe)
  if (!q) return null
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}`
}
