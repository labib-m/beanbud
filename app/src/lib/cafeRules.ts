// Rules for the "cafe details" part of the visit form. Pure and dependency-free so they can be
// tested (supabase/tests/cafe_rules.test.mjs). The database enforces the same rules.

/** An existing cafe's address and map link are read-only in the visit form: change them with "Edit cafe" on its page. */
export function detailsAreLocked(existing: object | undefined): boolean {
  return !!existing
}

/**
 * A NEW cafe goes straight into the shared directory, so it needs an address and a map link.
 * Returns what to tell the person, or null when it is fine.
 */
export function newCafeProblem(address: string, mapUrl: string): string | null {
  if (!address.trim()) return "Add the cafe's address. It goes into the shared directory, so everyone can find it."
  if (!mapUrl.trim()) return 'Add a map link so people can find it (paste it from your maps app).'
  if (!/^https?:\/\//i.test(mapUrl.trim())) return 'The map link must start with http:// or https://'
  return null
}
