// Tests the "most recent cafes / drinks" logic used on profile screens.
// Run:  node --test supabase/tests/recent.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recentCafes, recentDrinks, newestFirst } from '../../app/src/lib/recent.ts'

let n = 0
const visit = (cafe, date, drinks = [], extra = {}) => ({
  id: 'v' + ++n, cafe_id: cafe, visited_on: date, created_at: date + 'T10:00:00Z', overall: null,
  cafes: { name: 'Cafe ' + cafe.toUpperCase(), city: 'Dhaka', area: 'Banani' },
  visit_drinks: drinks.map((d, i) => ({ drink_type: d, score: null, sort_order: i })),
  ...extra,
})

test('no visits gives empty lists', () => {
  assert.deepEqual(recentCafes([]), [])
  assert.deepEqual(recentDrinks([]), [])
})

test('cafes: newest first, each cafe once, at most 3', () => {
  const vs = [
    visit('a', '2026-09-01'), visit('b', '2026-09-05'), visit('a', '2026-09-10'),
    visit('c', '2026-09-03'), visit('d', '2026-08-01'), visit('b', '2026-09-02'),
  ]
  const got = recentCafes(vs)
  assert.deepEqual(got.map((c) => c.cafeId), ['a', 'b', 'c'])       // a (10 Sep), b (5 Sep), c (3 Sep); d is 4th
  assert.equal(got[0].lastVisit, '2026-09-10')                      // a's LATEST visit, not its first
  assert.equal(got[1].lastVisit, '2026-09-05')
})

test('cafes: fewer than 3 distinct cafes just returns what exists', () => {
  const vs = [visit('a', '2026-09-01'), visit('a', '2026-09-02'), visit('a', '2026-09-03')]
  assert.equal(recentCafes(vs).length, 1)
})

test('cafes: same day is ordered by when it was logged; input is not reordered', () => {
  const early = visit('a', '2026-09-10', [], { created_at: '2026-09-10T08:00:00Z' })
  const late = visit('b', '2026-09-10', [], { created_at: '2026-09-10T20:00:00Z' })
  const input = [early, late]
  assert.deepEqual(recentCafes(input).map((c) => c.cafeId), ['b', 'a'])
  assert.deepEqual(input.map((v) => v.id), [early.id, late.id])
})

test('cafes: rating comes from the most recent visit, and numeric strings are converted', () => {
  const vs = [visit('a', '2026-09-01', [], { overall: 2 }), visit('a', '2026-09-09', [], { overall: '4.5' })]
  assert.equal(recentCafes(vs)[0].overall, 4.5)
  assert.equal(recentCafes([visit('a', '2026-09-01')])[0].overall, null)
})

test('drinks: the 3 most recent logged, newest visit first, within-visit order kept', () => {
  const vs = [
    visit('a', '2026-09-01', ['Espresso']),
    visit('b', '2026-09-10', ['Latte', 'Cortado']),
    visit('c', '2026-09-05', ['Mocha', 'Flat white']),
  ]
  const got = recentDrinks(vs)
  assert.deepEqual(got.map((d) => d.drink), ['Latte', 'Cortado', 'Mocha'])
  assert.equal(got[0].cafeName, 'Cafe B')
  assert.equal(got[0].visitedOn, '2026-09-10')
})

test('drinks: the same drink at two cafes counts twice (different moments)', () => {
  const vs = [visit('a', '2026-09-01', ['Latte']), visit('b', '2026-09-02', ['Latte'])]
  assert.deepEqual(recentDrinks(vs).map((d) => d.cafeId), ['b', 'a'])
})

test('drinks: sort_order decides the order within one visit, and a visit with no drinks is skipped', () => {
  const v = visit('a', '2026-09-10', [])
  v.visit_drinks = [{ drink_type: 'Second', score: 4, sort_order: 1 }, { drink_type: 'First', score: null, sort_order: 0 }]
  const got = recentDrinks([visit('z', '2026-09-11', []), v])
  assert.deepEqual(got.map((d) => d.drink), ['First', 'Second'])
  assert.equal(got[1].score, 4)
})

test('newestFirst does not modify its input', () => {
  const vs = [visit('a', '2026-09-01'), visit('b', '2026-09-09')]
  const before = vs.map((v) => v.id)
  newestFirst(vs)
  assert.deepEqual(vs.map((v) => v.id), before)
})
