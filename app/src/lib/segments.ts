// Date and month segmentation for lists (designv2/specv2.md §9). Pure, no imports — tested in
// supabase/tests/segments.test.mjs. Dates are plain YYYY-MM-DD strings throughout; "today" is
// always passed in rather than read from the clock, so this is fully testable.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ymd(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

/** Whole days from `a` to `b` (positive when `b` is later), ignoring time of day. */
export function daysBetween(a: string, b: string): number {
  const A = ymd(a), B = ymd(b)
  return Math.round((Date.UTC(B.y, B.m, B.d) - Date.UTC(A.y, A.m, A.d)) / 86400000)
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const isoOf = (year: number, month: number, day: number) => `${year}-${pad2(month + 1)}-${pad2(day)}`

/**
 * specv2 §9.1: "Today" / "Yesterday" / "18 Sep" / "18 Sep 2025", for a row's own metadata line
 * (not the "6h" feed-author variant, which needs a timestamp rather than a plain date).
 */
export function relativeDate(date: string, today: string): string {
  const age = daysBetween(date, today)
  if (age <= 0) return 'Today'
  if (age === 1) return 'Yesterday'
  const { y, m, d } = ymd(date)
  const { y: ty } = ymd(today)
  return y === ty ? `${d} ${MONTH_SHORT[m]}` : `${d} ${MONTH_SHORT[m]} ${y}`
}

export type Bucket = { key: string; label: string; year: number; month: number }

/**
 * Which bucket a cafe's last-visit date falls into on the Notebook, sorted "Most recent"
 * (specv2 §9.2). `year`/`month` are the visit's own (not "today"'s), for month-transition
 * detection — only the "earlier in <month>" bucket's label borrows today's month name, since
 * by definition it's already within it.
 */
export function notebookBucketOf(lastDate: string, today: string): Bucket {
  const { y, m } = ymd(lastDate)
  const age = daysBetween(lastDate, today)
  if (age <= 0) return { key: 'today', label: 'Today', year: y, month: m }
  if (age === 1) return { key: 'yesterday', label: 'Yesterday', year: y, month: m }
  if (age <= 6) return { key: 'week', label: 'This week', year: y, month: m }
  const { y: ty, m: tm } = ymd(today)
  if (y === ty && m === tm) return { key: 'earlier', label: `Earlier in ${MONTH_NAMES[tm]}`, year: y, month: m }
  const label = y === ty ? MONTH_NAMES[m] : `${MONTH_NAMES[m]} ${y}`
  return { key: `${y}-${m}`, label, year: y, month: m }
}

export type DateBlock<T> =
  | { kind: 'group'; key: string; label: string; items: T[] }
  // year is null when it's the current year (specv2's date rules omit it then); the caller
  // decides how to style month vs. year, rather than parsing a pre-joined string.
  | { kind: 'divider'; month: string; year: number | null; visits: number; cafes: number }

/** Kept as an alias: the type used to be Notebook-specific before Feed/profile needed the same shape. */
export type NotebookBlock<T> = DateBlock<T>

/**
 * Buckets already-sorted-newest-first items into date sections using `bucketOf`, with a month
 * divider before each section whose month differs from the section before it — never before the
 * first section (specv2 §9.3). `countMonth` supplies each divider's "N visits · N cafés",
 * computed by the caller from the full (not bucket-limited) filtered visit list, per §9.5.
 */
function segment<T>(
  items: T[],
  today: string,
  bucketOf: (item: T) => Bucket,
  countMonth: (year: number, month: number) => { visits: number; cafes: number },
): DateBlock<T>[] {
  const out: DateBlock<T>[] = []
  let prevBucket: Bucket | null = null
  for (const item of items) {
    const b = bucketOf(item)
    if (prevBucket && (b.year !== prevBucket.year || b.month !== prevBucket.month)) {
      const { y: ty } = ymd(today)
      const c = countMonth(b.year, b.month)
      out.push({ kind: 'divider', month: MONTH_NAMES[b.month], year: b.year === ty ? null : b.year, visits: c.visits, cafes: c.cafes })
    }
    const last = out[out.length - 1]
    if (last?.kind === 'group' && last.key === b.key) last.items.push(item)
    else out.push({ kind: 'group', key: b.key, label: b.label, items: [item] })
    prevBucket = b
  }
  return out
}

/** Notebook, sorted "Most recent" (specv2 §9.2): Today/Yesterday/This week/Earlier in <month>/<Month>. */
export function segmentNotebook<T extends { lastDate: string }>(
  items: T[], today: string, countMonth: (year: number, month: number) => { visits: number; cafes: number },
): DateBlock<T>[] {
  return segment(items, today, (item) => notebookBucketOf(item.lastDate, today), countMonth)
}

/**
 * Feed Activity and profile "Recently visited", sorted by most recent (specv2 §9.2): one group
 * per calendar day (Today, Yesterday, "18 Sep", ...); several visits on the same day share a group.
 */
export function dayBucketOf(date: string, today: string): Bucket {
  const { y, m } = ymd(date)
  return { key: date, label: relativeDate(date, today), year: y, month: m }
}

export function segmentByDay<T extends { date: string }>(
  items: T[], today: string, countMonth: (year: number, month: number) => { visits: number; cafes: number },
): DateBlock<T>[] {
  return segment(items, today, (item) => dayBucketOf(item.date, today), countMonth)
}

// ---------------------------------------------------------------------------------------
// specv2 §7 "Month activity strip" / §9.4 monthly summary (You profile only).

export const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate()

/** How many of `dates` (YYYY-MM-DD) fall on each day of `year`/`month`, one entry per day. */
export function monthActivityCounts(dates: string[], year: number, month: number): number[] {
  const counts = new Array(daysInMonth(year, month)).fill(0)
  for (const d of dates) {
    const { y, m, d: day } = ymd(d)
    if (y === year && m === month) counts[day - 1]++
  }
  return counts
}

export type DayBar = { day: number; count: number; height: 4 | 16 | 26; color: 'acc' | 'accMuted' | 'line' | 'line2' }

/**
 * One bar per day: height by visit count (0 -> 4px, 1 -> 16px, 2+ -> 26px), colour --acc for
 * today/yesterday's bars, --accMuted for earlier ones, and for an empty day, --line if it's
 * still in the future or --line2 if it's already passed.
 */
export function monthActivityBars(counts: number[], year: number, month: number, today: string): DayBar[] {
  return counts.map((count, i) => {
    const day = i + 1
    const iso = isoOf(year, month, day)
    const height = count === 0 ? 4 : count === 1 ? 16 : 26
    let color: DayBar['color']
    if (count === 0) color = daysBetween(today, iso) > 0 ? 'line' : 'line2'
    else color = daysBetween(iso, today) <= 1 ? 'acc' : 'accMuted'
    return { day, count, height, color }
  })
}
