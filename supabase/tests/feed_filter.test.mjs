// Tests searching, filtering and sorting everyone's visits.  Run: node --test supabase/tests/feed_filter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterAndSort, citiesOf } from '../../app/src/lib/feedFilter.ts'
import { emptySelection, toggleSelected } from '../../app/src/lib/filters.ts'

let n = 0
const row = (o = {}) => ({
  id: 'r' + ++n, cafeId: 'c1', cafeName: 'Dose Espresso', city: 'Dhaka', area: 'Banani',
  visitedOn: '2026-09-10', createdAt: '2026-09-10T10:00:00Z', overall: null, who: 'Nabila @nabs', publicNote: null,
  goodFor: [], drinks: [], amenities: [], ...o,
})
const q = (o = {}) => ({ q: '', city: '', sel: emptySelection(), sort: 'recent', ...o })
const ids = (rows) => rows.map((r) => r.id)

test('no filters: everything, newest first', () => {
  const rows = [row({ id: 'old', visitedOn: '2026-09-01' }), row({ id: 'new', visitedOn: '2026-09-09' })]
  assert.deepEqual(ids(filterAndSort(rows, q())), ['new', 'old'])
})

test('search covers cafe, neighbourhood, city, drinks, the shared note and the person', () => {
  const rows = [
    row({ id: 'a', cafeName: 'Arabica', area: 'Sathon', city: 'Bangkok', who: 'Akib @akib' }),
    row({ id: 'b', drinks: ['Cold brew'] }),
    row({ id: 'c', publicNote: 'Great light in the afternoon' }),
  ]
  assert.deepEqual(ids(filterAndSort(rows, q({ q: 'sathon' }))), ['a'])
  assert.deepEqual(ids(filterAndSort(rows, q({ q: 'bangkok' }))), ['a'])
  assert.deepEqual(ids(filterAndSort(rows, q({ q: '@akib' }))), ['a'])
  assert.deepEqual(ids(filterAndSort(rows, q({ q: 'cold brew' }))), ['b'])
  assert.deepEqual(ids(filterAndSort(rows, q({ q: 'afternoon light' }))), ['c'])
  assert.deepEqual(filterAndSort(rows, q({ q: 'zzz' })), [])
})

test('city filter is exact, and combines with search', () => {
  const rows = [row({ id: 'd1', city: 'Dhaka' }), row({ id: 'b1', city: 'Bangkok', cafeName: 'Arabica' })]
  assert.deepEqual(ids(filterAndSort(rows, q({ city: 'Bangkok' }))), ['b1'])
  assert.deepEqual(filterAndSort(rows, q({ city: 'Bangkok', q: 'dose' })), [])
})

test('preset chips filter everyone\'s visits (any within a group, all across groups)', () => {
  const rows = [
    row({ id: 'friends-wifi', goodFor: ['Friends'], amenities: ['Wi-Fi'] }),
    row({ id: 'dates', goodFor: ['Dates'] }),
    row({ id: 'friends-only', goodFor: ['Friends'] }),
    row({ id: 'plain' }),
  ]
  const one = toggleSelected(emptySelection(), 'goodFor', 'Friends')
  assert.deepEqual(ids(filterAndSort(rows, q({ sel: one }))).sort(), ['friends-only', 'friends-wifi'])
  const either = toggleSelected(one, 'goodFor', 'Dates')
  assert.deepEqual(ids(filterAndSort(rows, q({ sel: either }))).sort(), ['dates', 'friends-only', 'friends-wifi'])
  const both = toggleSelected(one, 'amenities', 'Wi-Fi')
  assert.deepEqual(ids(filterAndSort(rows, q({ sel: both }))), ['friends-wifi'])
})

test('chips, search and city all narrow the same list', () => {
  const rows = [
    row({ id: 'x', drinks: ['Latte'], city: 'Dhaka' }),
    row({ id: 'y', drinks: ['Latte'], city: 'Bangkok', cafeName: 'Arabica' }),
    row({ id: 'z', drinks: ['Mocha'], city: 'Dhaka' }),
  ]
  const sel = toggleSelected(emptySelection(), 'drinks', 'Latte')
  assert.deepEqual(ids(filterAndSort(rows, q({ sel, city: 'Dhaka' }))), ['x'])
})

test('sort: highest rated puts unrated last; ties fall back to newest', () => {
  const rows = [
    row({ id: 'none', overall: null, visitedOn: '2026-09-20' }),
    row({ id: 'low', overall: 3, visitedOn: '2026-09-19' }),
    row({ id: 'high-old', overall: 5, visitedOn: '2026-09-01' }),
    row({ id: 'high-new', overall: 5, visitedOn: '2026-09-15' }),
  ]
  assert.deepEqual(ids(filterAndSort(rows, q({ sort: 'score' }))), ['high-new', 'high-old', 'low', 'none'])
})

test('sort: most visited puts the cafes visited most by anyone first', () => {
  const rows = [
    row({ id: 'solo', cafeId: 'quiet', cafeName: 'Quiet', visitedOn: '2026-09-20' }),
    row({ id: 'p1', cafeId: 'popular', cafeName: 'Popular', visitedOn: '2026-09-01' }),
    row({ id: 'p2', cafeId: 'popular', cafeName: 'Popular', visitedOn: '2026-09-02' }),
  ]
  assert.deepEqual(ids(filterAndSort(rows, q({ sort: 'visits' }))), ['p2', 'p1', 'solo'])
})

test('sort: the visit counts are taken over everything, not only what the filters leave', () => {
  const rows = [
    row({ id: 'a1', cafeId: 'A', cafeName: 'A', goodFor: ['Friends'], visitedOn: '2026-09-01' }),
    row({ id: 'a2', cafeId: 'A', cafeName: 'A', visitedOn: '2026-09-02' }),
    row({ id: 'b1', cafeId: 'B', cafeName: 'B', goodFor: ['Friends'], visitedOn: '2026-09-09' }),
  ]
  const sel = toggleSelected(emptySelection(), 'goodFor', 'Friends')
  assert.deepEqual(ids(filterAndSort(rows, q({ sel, sort: 'visits' }))), ['a1', 'b1'])   // A has 2 visits overall, B only 1
})

test('sort: name A-Z ignores case and accents', () => {
  const rows = [row({ id: '1', cafeName: 'zed' }), row({ id: '2', cafeName: 'Élan' }), row({ id: '3', cafeName: 'alpha' })]
  assert.deepEqual(ids(filterAndSort(rows, q({ sort: 'name' }))), ['3', '2', '1'])
})

test('the input list is never reordered, and cities come out unique and sorted', () => {
  const rows = [row({ id: 'b', city: 'Dhaka' }), row({ id: 'a', city: 'Bangkok' }), row({ id: 'c', city: 'Dhaka' })]
  const before = ids(rows)
  filterAndSort(rows, q({ sort: 'name' }))
  assert.deepEqual(ids(rows), before)
  assert.deepEqual(citiesOf(rows), ['Bangkok', 'Dhaka'])
})
