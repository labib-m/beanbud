// Tests what a cafe page shows.  Run: node --test supabase/tests/cafe_info.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recentDrinkEntries, criteriaAverages, publicNotes, visitorCount, cafeRating, friendsAt } from '../../app/src/lib/cafeInfo.ts'

let n = 0
const v = (user, date, o = {}) => ({
  id: 'v' + ++n, user_id: user, visited_on: date, created_at: date + 'T10:00:00Z', overall: null, public_note: null,
  profiles: { display_name: user, handle: user, avatar: null }, visit_drinks: [], ...o,
})
const dr = (t, s, i = 0, price = null) => ({ drink_type: t, score: s, sort_order: i, price })

test('recent drink entries: newest visit first, every drink (rated or not), in listed order, limited', () => {
  const vs = [
    v('a', '2026-09-01', { visit_drinks: [dr('Espresso', 3, 0, 150)] }),
    v('b', '2026-09-10', { currency: 'BDT', visit_drinks: [dr('Mocha', 4, 2), dr('Latte', null, 0, 280), dr('Cortado', 5, 1)] }),
  ]
  const r = recentDrinkEntries(vs)
  assert.deepEqual(r.map((x) => x.drink), ['Latte', 'Cortado', 'Mocha', 'Espresso'])
  assert.equal(r[0].price, 280)
  assert.equal(r[0].score, null)
  assert.equal(r[0].currency, 'BDT')
  assert.equal(r[0].userId, 'b')
  assert.equal(r[0].visit.id, vs[1].id)
  assert.equal(recentDrinkEntries(vs, 2).length, 2)
  assert.deepEqual(recentDrinkEntries([]), [])
})

test('recent drink entries: a visit with no drinks adds nothing, and the default limit is 5', () => {
  const vs = [v('a', '2026-09-09'), v('b', '2026-09-01', { visit_drinks: ['1', '2', '3', '4', '5', '6'].map((t, i) => dr(t, null, i)) })]
  assert.equal(recentDrinkEntries(vs).length, 5)
})

test('criteria averages: per category over everyone, unrated categories left out of their own average', () => {
  const rows = [
    { score_ambiance: 5, score_drinks: 4, score_food: null, score_service: 3, score_crowd: '2' },
    { score_ambiance: 3, score_drinks: null, score_food: null, score_service: 4, score_crowd: null },
  ]
  const r = Object.fromEntries(criteriaAverages(rows).map((c) => [c.key, c]))
  assert.equal(r.ambiance.average, 4)
  assert.equal(r.drinks.average, 4)
  assert.equal(r.drinks.count, 1)
  assert.equal(r.food.average, 0)
  assert.equal(r.food.count, 0)
  assert.equal(r.service.average, 3.5)
  assert.equal(r.crowd.average, 2)
  assert.deepEqual(criteriaAverages([]).map((c) => c.count), [0, 0, 0, 0, 0])
})

test('public notes: only shared, non-blank notes; trimmed; newest first', () => {
  const vs = [
    v('a', '2026-09-01', { public_note: '  Quiet on weekdays  ' }),
    v('b', '2026-09-09', { public_note: '   ' }),
    v('c', '2026-09-05', { public_note: null }),
    v('d', '2026-09-08', { public_note: 'Great light' }),
  ]
  const notes = publicNotes(vs)
  assert.deepEqual(notes.map((x) => x.note), ['Great light', 'Quiet on weekdays'])
  assert.equal(notes[1].userId, 'a')
})

test('visitor count is distinct people, and inputs are never reordered', () => {
  const vs = [v('a', '2026-09-01'), v('a', '2026-09-02'), v('b', '2026-09-03')]
  assert.equal(visitorCount(vs), 2)
  const before = vs.map((x) => x.id)
  recentDrinkEntries(vs); publicNotes(vs)
  assert.deepEqual(vs.map((x) => x.id), before)
})

test('cafe rating: the average of every rated visit, from everyone', () => {
  const r = cafeRating([5, 4, 3])
  assert.equal(r.count, 3)
  assert.equal(r.average, 4)
  assert.equal(cafeRating([4.5, 3.5]).average, 4)
  assert.equal(cafeRating([5]).average, 5)
})

test('cafe rating: visits nobody rated are left out, not counted as zero', () => {
  const r = cafeRating([5, null, undefined, 0, 3])
  assert.equal(r.count, 2)
  assert.equal(r.average, 4)
})

test('cafe rating: numbers arriving as text (the database sends numeric values that way) still work', () => {
  const r = cafeRating(['4.5', '3.5', '5.00'])
  assert.equal(r.count, 3)
  assert.ok(Math.abs(r.average - (4.5 + 3.5 + 5) / 3) < 1e-9)
})

test('cafe rating: nothing rated gives 0 and 0, never NaN', () => {
  assert.deepEqual(cafeRating([]), { average: 0, count: 0 })
  assert.deepEqual(cafeRating([null, undefined, 0, 'abc']), { average: 0, count: 0 })
})

test('cafe rating: keeps fractions so the star fill is exact, and rounds only when shown', () => {
  const r = cafeRating([4, 4, 5])
  assert.ok(Math.abs(r.average - 13 / 3) < 1e-9)
  assert.equal(r.average.toFixed(1), '4.3')
})

test('friendsAt: excludes me, counts visits, averages each person\'s own overall', () => {
  const vs = [
    v('me', '2026-09-01', { overall: 3 }),
    v('zeba', '2026-09-02', { overall: 3 }),
    v('zeba', '2026-09-10', { overall: 4 }),
    v('kakku', '2026-09-05', { overall: 5 }),
  ]
  const out = friendsAt(vs, 'me')
  assert.equal(out.length, 2) // "me" is excluded
  assert.deepEqual(out.map((f) => f.userId), ['zeba', 'kakku']) // most visits first
  assert.equal(out[0].visits, 2)
  assert.ok(Math.abs(out[0].average - 3.5) < 1e-9)
  assert.equal(out[1].average, 5)
})

test('friendsAt: an unrated visit still counts toward visits, not toward the average', () => {
  const vs = [v('zeba', '2026-09-01', { overall: null })]
  const out = friendsAt(vs, 'me')
  assert.equal(out[0].visits, 1)
  assert.equal(out[0].average, 0)
})

test('friendsAt: nobody but me has visited gives an empty list', () => {
  assert.deepEqual(friendsAt([v('me', '2026-09-01')], 'me'), [])
})
