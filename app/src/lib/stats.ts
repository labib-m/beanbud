import { SCORES, scoreOf, type FullVisit, type ScoreKey } from './types'

export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

export type CafeGroup = {
  cafeId: string
  cafe: FullVisit['cafes']
  visits: FullVisit[] // oldest first
  latest: FullVisit
  mean: number // 0 = nothing rated
  count: number
  lastDate: string
  goodFor: string[]
}

export function groupByCafe(visits: FullVisit[]): CafeGroup[] {
  const m = new Map<string, FullVisit[]>()
  for (const v of visits) (m.get(v.cafe_id) ?? m.set(v.cafe_id, []).get(v.cafe_id)!).push(v)
  return [...m.entries()].map(([cafeId, vs]) => {
    vs.sort((a, b) => a.visited_on.localeCompare(b.visited_on) || a.created_at.localeCompare(b.created_at))
    const latest = vs[vs.length - 1]
    return {
      cafeId, cafe: latest.cafes, visits: vs, latest,
      mean: mean(vs.map((v) => v.overall).filter((x): x is number => x != null)),
      count: vs.length, lastDate: latest.visited_on,
      goodFor: [...new Set(vs.flatMap((v) => v.good_for))],
    }
  })
}

/** Change between the last two rated visits, or null with fewer than two. */
export function trend(g: CafeGroup): number | null {
  const rated = g.visits.filter((v) => v.overall != null)
  if (rated.length < 2) return null
  return Number(rated[rated.length - 1].overall) - Number(rated[rated.length - 2].overall)
}

export function criterion(g: CafeGroup, key: ScoreKey): number {
  return mean(g.visits.map((v) => scoreOf(v, key)).filter((x): x is number => x != null))
}

export const criteria = SCORES

export type DrinkStat = { type: string; n: number; avgScore: number; prices: { currency: string; avg: number }[] }

export function drinkStats(g: CafeGroup): DrinkStat[] {
  const m = new Map<string, { n: number; scores: number[]; byCur: Map<string, number[]> }>()
  for (const v of g.visits) {
    for (const d of v.visit_drinks) {
      const e = m.get(d.drink_type) ?? { n: 0, scores: [] as number[], byCur: new Map<string, number[]>() }
      e.n++
      if (d.score != null) e.scores.push(d.score)
      if (d.price != null && d.price > 0 && v.currency) {
        const arr = e.byCur.get(v.currency) ?? []
        arr.push(Number(d.price))
        e.byCur.set(v.currency, arr)
      }
      m.set(d.drink_type, e)
    }
  }
  return [...m.entries()]
    .map(([type, e]) => ({
      type, n: e.n, avgScore: mean(e.scores),
      prices: [...e.byCur.entries()].map(([currency, p]) => ({ currency, avg: mean(p) })),
    }))
    .sort((a, b) => b.n - a.n)
}

/** Disc colour rule from design/spec.md §1.3. */
export function tone(score: number): 'acc' | 'sage' | 'plain' {
  return score >= 4.5 ? 'acc' : score >= 4 ? 'sage' : 'plain'
}

export function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function money(n: number, symbol: string): string {
  const dec = Number.isInteger(n) ? 0 : 2
  return symbol + n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export type PersonStats = { visits: number; cafes: number; cities: number; mean: number; last: string }

export function personStats(visits: { cafe_id: string; visited_on: string; overall: number | null; cafes: { city: string } }[]): PersonStats {
  return {
    visits: visits.length,
    cafes: new Set(visits.map((v) => v.cafe_id)).size,
    cities: new Set(visits.map((v) => v.cafes.city)).size,
    mean: mean(visits.map((v) => v.overall).filter((x): x is number => x != null).map(Number)),
    last: visits.reduce((a, v) => (v.visited_on > a ? v.visited_on : a), ''),
  }
}

/** Mean overall per cafe for a set of visits. */
export function meanByCafe(visits: { cafe_id: string; overall: number | null }[]): Map<string, number> {
  const by = new Map<string, number[]>()
  for (const v of visits) if (v.overall != null) (by.get(v.cafe_id) ?? by.set(v.cafe_id, []).get(v.cafe_id)!).push(Number(v.overall))
  return new Map([...by.entries()].map(([k, a]) => [k, mean(a)]))
}

export function timeAgo(iso: string): string {
  const mins = (Date.now() - new Date(iso).getTime()) / 60000
  if (mins < 1) return 'now'
  if (mins < 60) return `${Math.floor(mins)}m`
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`
  if (mins < 60 * 48) return 'yesterday'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
