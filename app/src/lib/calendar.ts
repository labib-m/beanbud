// The month-by-month calendar page: which days a visit was logged. Pure; the only import is
// the shared month helpers (tested in supabase/tests/calendar.test.mjs).
import { MONTH_NAMES, daysInMonth } from './segments.ts'

export type DayCell = { day: number; iso: string; count: number; future: boolean; today: boolean }
export type MonthView = {
  year: number
  month: number            // 0-11
  label: string            // "September 2026"
  weeks: (DayCell | null)[][]   // Sunday-first; null pads the days before the 1st and after the last
  visits: number
  days: number             // days with at least one visit
}

/** "YYYY-MM-DD" -> how many visits that day. */
export function countByDay(dates: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const d of dates) m.set(d, (m.get(d) ?? 0) + 1)
  return m
}

/** Every month from this one back to the earliest visit's, newest first (at least this month). */
export function monthsBack(dates: string[], today: string): { year: number; month: number }[] {
  const [ty, tm] = today.split('-').map(Number)
  const earliest = [...dates].sort()[0]
  const [ey, em] = earliest ? earliest.split('-').map(Number) : [ty, tm]
  const out: { year: number; month: number }[] = []
  let y = ty, m = tm - 1
  while (y > ey || (y === ey && m >= em - 1)) {
    out.push({ year: y, month: m })
    if (--m < 0) { m = 11; y-- }
  }
  return out
}

export function buildMonth(year: number, month: number, counts: Map<string, number>, today: string): MonthView {
  const pad = (n: number) => String(n).padStart(2, '0')
  const total = daysInMonth(year, month)
  const lead = new Date(year, month, 1).getDay()
  const cells: (DayCell | null)[] = Array.from({ length: lead }, () => null)
  let visits = 0, days = 0
  for (let day = 1; day <= total; day++) {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}`
    const count = counts.get(iso) ?? 0
    visits += count
    if (count) days++
    cells.push({ day, iso, count, future: iso > today, today: iso === today })
  }
  while (cells.length % 7) cells.push(null)
  const weeks: (DayCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { year, month, label: `${MONTH_NAMES[month]} ${year}`, weeks, visits, days }
}
