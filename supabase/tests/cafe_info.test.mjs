// Tests what a cafe page shows.  Run: node --test supabase/tests/cafe_info.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recentLogs, drinkReviews, publicNotes, visitorCount } from '../../app/src/lib/cafeInfo.ts'

let n = 0
const v = (user, date, o = {}) => ({
  id: 'v' + ++n, user_id: user, visited_on: date, created_at: date + 'T10:00:00Z', overall: null, public_note: null,
  profiles: { display_name: user, handle: user, avatar: null }, visit_drinks: [], ...o,
})
const dr = (t, s, i = 0) => ({ drink_type: t, score: s, sort_order: i })

test('recent logs: newest first, limited', () => {
  const vs = [v('a', '2026-09-01'), v('b', '2026-09-09'), v('a', '2026-09-05'), v('c', '2026-08-01')]
  assert.deepEqual(recentLogs(vs, 3).map((x) => x.visited_on), ['2026-09-09', '2026-09-05', '2026-09-01'])
  assert.deepEqual(recentLogs([]), [])
})

test('drink reviews: only RATED drinks, newest first, in listed order', () => {
  const vs = [
    v('a', '2026-09-01', { visit_drinks: [dr('Espresso', 3)] }),
    v('b', '2026-09-10', { visit_drinks: [dr('Latte', null, 0), dr('Cortado', 5, 1), dr('Mocha', 4, 2)] }),
  ]
  const r = drinkReviews(vs)
  assert.deepEqual(r.map((x) => x.drink), ['Cortado', 'Mocha', 'Espresso'])   // unrated Latte is skipped
  assert.equal(r[0].userId, 'b')
  assert.equal(drinkReviews(vs, 2).length, 2)
})

test('drink reviews: sort_order decides order inside a visit', () => {
  const vs = [v('a', '2026-09-10', { visit_drinks: [dr('Second', 4, 1), dr('First', 5, 0)] })]
  assert.deepEqual(drinkReviews(vs).map((x) => x.drink), ['First', 'Second'])
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
  recentLogs(vs); drinkReviews(vs); publicNotes(vs)
  assert.deepEqual(vs.map((x) => x.id), before)
})
