// Tests app/src/lib/calendar.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/calendar.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMonth, countByDay, monthsBack } from '../../app/src/lib/calendar.ts'

test('countByDay: several visits on one day add up', () => {
  const m = countByDay(['2026-09-01', '2026-09-01', '2026-09-03'])
  assert.equal(m.get('2026-09-01'), 2)
  assert.equal(m.get('2026-09-03'), 1)
  assert.equal(m.get('2026-09-02'), undefined)
})

test('monthsBack: this month back to the earliest visit, newest first, across a year boundary', () => {
  assert.deepEqual(monthsBack(['2026-07-15', '2026-09-02'], '2026-09-23'), [
    { year: 2026, month: 8 }, { year: 2026, month: 7 }, { year: 2026, month: 6 },
  ])
  assert.deepEqual(monthsBack(['2025-11-30'], '2026-01-05').map((x) => [x.year, x.month]), [[2026, 0], [2025, 11], [2025, 10]])
})

test('monthsBack: no visits still shows this month; a future-dated visit does not extend it', () => {
  assert.deepEqual(monthsBack([], '2026-09-23'), [{ year: 2026, month: 8 }])
  assert.equal(monthsBack(['2026-09-23'], '2026-09-23').length, 1)
})

test('buildMonth: Sunday-first weeks, padded, September 2026 starts on a Tuesday', () => {
  const v = buildMonth(2026, 8, countByDay(['2026-09-02', '2026-09-02', '2026-09-10']), '2026-09-23')
  assert.equal(v.label, 'September 2026')
  assert.equal(v.weeks[0].findIndex((c) => c?.day === 1), 2)
  assert.ok(v.weeks.every((w) => w.length === 7))
  assert.equal(v.visits, 3)
  assert.equal(v.days, 2)
})

test('buildMonth: future days and today are flagged, and a month with no visits is all zero', () => {
  const v = buildMonth(2026, 8, new Map(), '2026-09-23')
  const flat = v.weeks.flat().filter(Boolean)
  assert.equal(flat.length, 30)
  assert.equal(flat.find((c) => c.day === 23).today, true)
  assert.equal(flat.find((c) => c.day === 24).future, true)
  assert.equal(flat.find((c) => c.day === 22).future, false)
  assert.equal(v.visits, 0)
  assert.equal(v.days, 0)
})
