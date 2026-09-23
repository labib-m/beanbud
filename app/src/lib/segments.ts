// Date and month segmentation for lists (designv2/specv2.md §9). Pure, no imports — tested in
// supabase/tests/segments.test.mjs. Dates are plain YYYY-MM-DD strings throughout; "today" is
// always passed in rather than read from the clock, so this is fully testable.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function ymd(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

/** Whole days from `a` to `b` (positive when `b` is later), ignoring time of day. */
function daysBetween(a: string, b: string): number {
  const A = ymd(a), B = ymd(b)
  return Math.round((Date.UTC(B.y, B.m, B.d) - Date.UTC(A.y, A.m, A.d)) / 86400000)
}

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

export type NotebookBlock<T> =
  | { kind: 'group'; key: string; label: string; items: T[] }
  // year is null when it's the current year (specv2's date rules omit it then); the caller
  // decides how to style month vs. year, rather than parsing a pre-joined string.
  | { kind: 'divider'; month: string; year: number | null; visits: number; cafes: number }

/**
 * Buckets already-sorted-newest-first items into date sections, with a month divider before
 * each section whose month differs from the section before it — never before the first section
 * (specv2 §9.3). `countMonth` supplies each divider's "N visits · N cafés", computed by the
 * caller from the full (not bucket-limited) filtered visit list, per §9.5.
 */
export function segmentNotebook<T extends { lastDate: string }>(
  items: T[],
  today: string,
  countMonth: (year: number, month: number) => { visits: number; cafes: number },
): NotebookBlock<T>[] {
  const out: NotebookBlock<T>[] = []
  let prevBucket: Bucket | null = null
  for (const item of items) {
    const b = notebookBucketOf(item.lastDate, today)
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
