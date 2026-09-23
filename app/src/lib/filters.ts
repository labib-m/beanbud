// Preset filter chips, search and sort rules shared by the Notebook and the Feed.
// Pure functions with no imports (tested in supabase/tests/filters.test.mjs).

export type Category = 'goodFor' | 'drinks' | 'amenities'
export const CATEGORIES: Category[] = ['goodFor', 'drinks', 'amenities']
export const CATEGORY_LABEL: Record<Category, string> = { goodFor: 'Good for', drinks: 'Drinks', amenities: 'Has' }

/** The things about ONE visit that a chip can match. */
export type Features = Record<Category, string[]>
export type Presets = Record<Category, string[]>
export type Selected = Record<Category, string[]>

export const emptySelection = (): Selected => ({ goodFor: [], drinks: [], amenities: [] })

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * The chips to offer: for each category, the `perCategory` features that appear on the most visits
 * (a feature counts once per visit). Ties go alphabetically. A category with fewer than that just
 * gets fewer chips, and one with none gets none.
 */
export function topPresets(visits: Features[], perCategory = 3): Presets {
  const out: Presets = { goodFor: [], drinks: [], amenities: [] }
  for (const cat of CATEGORIES) {
    const counts = new Map<string, { label: string; n: number }>()
    for (const v of visits) {
      const seen = new Set<string>()
      for (const raw of v[cat]) {
        const k = key(raw)
        if (!k || seen.has(k)) continue
        seen.add(k)
        const e = counts.get(k)
        if (e) e.n++
        else counts.set(k, { label: raw.trim(), n: 1 })
      }
    }
    out[cat] = [...counts.values()]
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
      .slice(0, perCategory)
      .map((e) => e.label)
  }
  return out
}

export const isSelected = (sel: Selected, cat: Category, label: string) => sel[cat].some((l) => key(l) === key(label))
export const hasSelection = (sel: Selected) => CATEGORIES.some((c) => sel[c].length > 0)

/** A new selection with this chip switched on or off. */
export function toggleSelected(sel: Selected, cat: Category, label: string): Selected {
  const has = isSelected(sel, cat, label)
  return { ...sel, [cat]: has ? sel[cat].filter((l) => key(l) !== key(label)) : [...sel[cat], label] }
}

/**
 * Does ONE visit match the chosen chips? Chips in the same group mean "any of these"; different
 * groups all have to be satisfied. A group with nothing chosen puts no condition on the visit.
 */
export function matchesVisit(f: Features, sel: Selected): boolean {
  return CATEGORIES.every((cat) => {
    if (!sel[cat].length) return true
    const have = new Set(f[cat].map(key))
    return sel[cat].some((l) => have.has(key(l)))
  })
}

/** Does a cafe with SEVERAL visits match? Each chosen group has to be satisfied by at least one of its visits. */
export function matchesCafe(visits: Features[], sel: Selected): boolean {
  return CATEGORIES.every((cat) => {
    if (!sel[cat].length) return true
    return visits.some((f) => {
      const have = new Set(f[cat].map(key))
      return sel[cat].some((l) => have.has(key(l)))
    })
  })
}

/** Every word typed has to appear somewhere in the text ("dose flat" finds a flat white at Dose). Blank matches everything. */
export function matchesSearch(query: string, haystack: (string | null | undefined)[]): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const text = haystack.filter(Boolean).join(' ').toLowerCase()
  return terms.every((t) => text.includes(t))
}

export type Sort = 'recent' | 'score' | 'visits' | 'name'
export const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'score', label: 'Highest rated' },
  { value: 'visits', label: 'Most visited' },
  { value: 'name', label: 'Name A–Z' },
]
// Shorter wording for the Notebook's sort tabs (specv2 §8.1), where SORT_OPTIONS' fuller
// labels (used in Feed's sort pill) would crowd four tabs across one row.
export const SORT_TAB_LABEL: Record<Sort, string> = { recent: 'Recent', score: 'Top rated', visits: 'Most visited', name: 'Name' }
