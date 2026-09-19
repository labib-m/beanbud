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
