import { mean } from './stats'
import type { LiteVisit, Profile } from './types'

type Namey = { display_name: string | null; handle: string | null } | null | undefined

export function displayName(p: Namey): string {
  return p?.display_name?.trim() || (p?.handle ? '@' + p.handle : 'Someone')
}
export const handleText = (p: Namey) => (p?.handle ? '@' + p.handle : '')
/** "@username · Home city", the line under a profile's title. */
export const identityLine = (handle: string | null, city: string | null): string =>
  [handle ? '@' + handle : '', city ?? ''].filter(Boolean).join(' · ')
export const initial = (p: Namey) => displayName(p).replace(/^@/, '')[0]?.toUpperCase() ?? '?'

// specv2 §1.3: five pastel tones, the same in both themes. A person keeps one tone regardless
// of which emoji they're using as their avatar (previously tone followed the glyph choice).
const TONES = ['#ffc6a5', '#ccdbb2', '#e1eecc', '#ffe1d0', '#f0fae1'] as const

/** Stable avatar background colour from the user id. */
export function toneOf(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}

export function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export type Stats = { cafes: number; visits: number; cities: number; average: number; last: string }

export function statsFor(visits: LiteVisit[]): Stats {
  return {
    cafes: new Set(visits.map((v) => v.cafe_id)).size,
    visits: visits.length,
    cities: new Set(visits.map((v) => v.cafes.city)).size,
    average: mean(visits.map((v) => v.overall).filter((x): x is number => x != null).map(Number)),
    last: visits.map((v) => v.visited_on).sort().pop() ?? '',
  }
}

export type Overlap = { cafeId: string; name: string; mine: number; theirs: number }

/** Cafes both people have visited, with each person's average overall. */
export function overlaps(mine: LiteVisit[], theirs: LiteVisit[]): Overlap[] {
  const avg = (vs: LiteVisit[]) => {
    const m = new Map<string, { name: string; scores: number[] }>()
    for (const v of vs) {
      const e = m.get(v.cafe_id) ?? { name: v.cafes.name, scores: [] }
      if (v.overall != null) e.scores.push(Number(v.overall))
      m.set(v.cafe_id, e)
    }
    return m
  }
  const a = avg(mine), b = avg(theirs)
  return [...a.entries()]
    .filter(([id]) => b.has(id))
    .map(([id, e]) => ({ cafeId: id, name: e.name, mine: mean(e.scores), theirs: mean(b.get(id)!.scores) }))
}

export const emptyProfile = (id: string): Profile => ({
  id, display_name: null, handle: null, home_city: null, tagline: null, usual_order: null, about: null, avatar: null,
})
