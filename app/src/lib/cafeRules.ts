// Rules for the "cafe details" part of the visit form. Pure and dependency-free so they can be
// tested (supabase/tests/cafe_rules.test.mjs). The database enforces the same rules.

const isWebLink = (s: string) => /^https?:\/\//i.test(s.trim())

/**
 * A NEW cafe goes straight into the shared directory, so it needs an address and a map link.
 * Returns what to tell the person, or null when it is fine.
 */
export function newCafeProblem(address: string, mapUrl: string): string | null {
  if (!address.trim()) return "Add the cafe's address. It goes into the shared directory, so everyone can find it."
  if (!mapUrl.trim()) return 'Add a map link so people can find it (paste it from your maps app).'
  if (!isWebLink(mapUrl)) return 'The map link must start with http:// or https://'
  return null
}

export type DetailsCheck = {
  address: string        // what will be sent: what was typed, or the saved value if the box was left blank
  mapUrl: string
  addressChanged: boolean
  mapChanged: boolean
  changed: boolean       // the person really did change something
  canUpdate: boolean     // and it can be applied: both values would end up filled in, and the link is a web link
  problem: string | null // a typed map link that is not a web link
}

/**
 * An EXISTING cafe's details are pre-filled in the visit form and can be corrected there. A blank box never
 * erases what is saved: the saved value is kept, and the visit still saves. A real change must be confirmed
 * by the person before it touches the shared directory.
 */
export function checkDetailsUpdate(
  saved: { address: string | null; map_url: string | null },
  typedAddress: string,
  typedMap: string,
): DetailsCheck {
  const savedAddress = (saved.address ?? '').trim()
  const savedMap = (saved.map_url ?? '').trim()
  const address = typedAddress.trim() || savedAddress
  const mapUrl = typedMap.trim() || savedMap
  const problem = typedMap.trim() && !isWebLink(typedMap) ? 'The map link must start with http:// or https://' : null
  const addressChanged = address !== savedAddress
  const mapChanged = mapUrl !== savedMap
  const changed = addressChanged || mapChanged
  return { address, mapUrl, addressChanged, mapChanged, changed, canUpdate: changed && !!address && !!mapUrl && !problem, problem }
}
