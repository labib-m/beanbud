// Tests app/src/lib/segments.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/segments.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notebookBucketOf, relativeDate, segmentByDay, segmentNotebook } from '../../app/src/lib/segments.ts'

const TODAY = '2026-09-23' // a Wednesday; not otherwise meaningful

test('relativeDate: today, yesterday, same-year date, earlier-year date', () => {
  assert.equal(relativeDate('2026-09-23', TODAY), 'Today')
  assert.equal(relativeDate('2026-09-22', TODAY), 'Yesterday')
  assert.equal(relativeDate('2026-09-01', TODAY), '1 Sep')
  assert.equal(relativeDate('2025-12-25', TODAY), '25 Dec 2025')
})

test('notebookBucketOf: today, yesterday, this week, earlier in the month, previous months', () => {
  assert.equal(notebookBucketOf('2026-09-23', TODAY).label, 'Today')
  assert.equal(notebookBucketOf('2026-09-22', TODAY).label, 'Yesterday')
  assert.equal(notebookBucketOf('2026-09-21', TODAY).label, 'This week') // 2 days ago
  assert.equal(notebookBucketOf('2026-09-17', TODAY).label, 'This week') // 6 days ago
  assert.equal(notebookBucketOf('2026-09-16', TODAY).label, 'Earlier in September') // 7 days ago, same month
  assert.equal(notebookBucketOf('2026-09-01', TODAY).label, 'Earlier in September')
})

test('notebookBucketOf: previous month omits the year when it is the current year, includes it otherwise', () => {
  assert.equal(notebookBucketOf('2026-08-14', TODAY).label, 'August')
  assert.equal(notebookBucketOf('2025-08-14', TODAY).label, 'August 2025')
})

test('notebookBucketOf: a future date (clock skew) is treated as today, not a crash', () => {
  assert.equal(notebookBucketOf('2026-09-25', TODAY).label, 'Today')
})

test('notebookBucketOf: bucket key differentiates the same month across different years', () => {
  const a = notebookBucketOf('2026-08-14', TODAY)
  const b = notebookBucketOf('2025-08-14', TODAY)
  assert.notEqual(a.key, b.key)
})

test('segmentNotebook: groups consecutive same-bucket items and keeps order', () => {
  const items = [
    { name: 'A', lastDate: '2026-09-23' }, // today
    { name: 'B', lastDate: '2026-09-23' }, // today
    { name: 'C', lastDate: '2026-09-22' }, // yesterday
  ]
  const out = segmentNotebook(items, TODAY, () => ({ visits: 0, cafes: 0 }))
  assert.equal(out.length, 2)
  assert.deepEqual(out[0], { kind: 'group', key: 'today', label: 'Today', items: [items[0], items[1]] })
  assert.equal(out[1].kind, 'group')
  assert.equal(out[1].label, 'Yesterday')
})

test('segmentNotebook: no divider before the very first group, even when it is an older month', () => {
  const items = [{ name: 'A', lastDate: '2026-08-01' }]
  const out = segmentNotebook(items, TODAY, () => ({ visits: 1, cafes: 1 }))
  assert.equal(out.length, 1)
  assert.equal(out[0].kind, 'group')
})

test('segmentNotebook: inserts a divider at a month transition, with counts from countMonth', () => {
  const items = [
    { name: 'A', lastDate: '2026-09-23' }, // today, September
    { name: 'B', lastDate: '2026-08-14' }, // August
  ]
  const out = segmentNotebook(items, TODAY, (year, month) => (month === 7 ? { visits: 3, cafes: 2 } : { visits: 0, cafes: 0 }))
  assert.equal(out.length, 3)
  assert.equal(out[0].kind, 'group') // September, no divider before it (it's first)
  assert.deepEqual(out[1], { kind: 'divider', month: 'August', year: null, visits: 3, cafes: 2 })
  assert.equal(out[2].kind, 'group')
  assert.equal(out[2].label, 'August')
})

test('segmentNotebook: a divider for a previous year carries that year; the current year is null', () => {
  const items = [
    { name: 'A', lastDate: '2026-09-23' },
    { name: 'B', lastDate: '2025-12-01' },
  ]
  const out = segmentNotebook(items, TODAY, () => ({ visits: 1, cafes: 1 }))
  assert.equal(out[1].kind, 'divider')
  assert.equal(out[1].month, 'December')
  assert.equal(out[1].year, 2025)
})

test('segmentByDay: multiple visits on the same day share one group', () => {
  const items = [{ date: '2026-09-23' }, { date: '2026-09-23' }, { date: '2026-09-22' }]
  const out = segmentByDay(items, TODAY, () => ({ visits: 0, cafes: 0 }))
  assert.equal(out.length, 2)
  assert.equal(out[0].label, 'Today')
  assert.equal(out[0].items.length, 2)
  assert.equal(out[1].label, 'Yesterday')
})

test('segmentByDay: a month transition still gets a divider, same as Notebook', () => {
  const items = [{ date: '2026-09-23' }, { date: '2026-08-14' }]
  const out = segmentByDay(items, TODAY, () => ({ visits: 5, cafes: 2 }))
  assert.equal(out[1].kind, 'divider')
  assert.equal(out[1].month, 'August')
})
