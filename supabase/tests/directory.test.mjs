// Tests the A-Z directory logic.  Run: node --test supabase/tests/directory.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupAlphabetically, letterOf, matchesQuery, rateCafes, sortRatedCafes } from '../../app/src/lib/directory.ts'

let n = 0
const cafe = (name, area = 'Banani', city = 'Dhaka') => ({ id: 'c' + ++n, name, area, city })
const nameOf = (id) => ({ zeba: 'Zeba', kakku: 'Kakku', nuzhat: 'Nuzhat' })[id] ?? id

test('letterOf: first letter, accents and case ignored, everything else is #', () => {
  assert.equal(letterOf('Dose Espresso'), 'D')
  assert.equal(letterOf('dose'), 'D')
  assert.equal(letterOf('  Élan'), 'E')
  assert.equal(letterOf('7 Seas'), '#')
  assert.equal(letterOf('"Quoted"'), '#')
  assert.equal(letterOf(''), '#')
  assert.equal(letterOf('বাংলা'), 'ব')   // other scripts keep their own letter
})

test('sorted A-Z ignoring case and accents, grouped under letters', () => {
  const g = groupAlphabetically([cafe('north end'), cafe('Arabica'), cafe('Élan'), cafe('Baan Saen Saep'), cafe('Barock'), cafe('Dose')])
  assert.deepEqual(g.map((x) => x.letter), ['A', 'B', 'D', 'E', 'N'])
  assert.deepEqual(g.find((x) => x.letter === 'B').cafes.map((c) => c.name), ['Baan Saen Saep', 'Barock'])
})

test('numbers sort naturally and non-letters file under # at the END', () => {
  const g = groupAlphabetically([cafe('Zed'), cafe('7 Seas'), cafe('Alpha'), cafe('42 Cafe'), cafe('9 Lives')])
  assert.deepEqual(g.map((x) => x.letter), ['A', 'Z', '#'])
  assert.deepEqual(g[2].cafes.map((c) => c.name), ['7 Seas', '9 Lives', '42 Cafe'])
})

test('same name in different neighbourhoods: both shown, ordered by neighbourhood', () => {
  const g = groupAlphabetically([cafe('Second Cup', 'Gulshan 2'), cafe('Second Cup', 'Dhanmondi')])
  assert.deepEqual(g[0].cafes.map((c) => c.area), ['Dhanmondi', 'Gulshan 2'])
})

test('search matches name, neighbourhood or city, ignoring case; blank shows all', () => {
  const list = [cafe('Dose Espresso', 'Banani'), cafe('Arabica', 'Sathon', 'Bangkok')]
  assert.equal(matchesQuery(list[0], 'DOSE'), true)
  assert.equal(matchesQuery(list[1], 'sathon'), true)
  assert.equal(matchesQuery(list[1], 'bangkok'), true)
  assert.equal(matchesQuery(list[0], 'bangkok'), false)
  assert.equal(groupAlphabetically(list, '  ').length, 2)
  assert.deepEqual(groupAlphabetically(list, 'bangkok').flatMap((g) => g.cafes.map((c) => c.name)), ['Arabica'])
  assert.deepEqual(groupAlphabetically(list, 'zzz'), [])
})

test('does not modify its input', () => {
  const list = [cafe('B'), cafe('A')]
  const before = list.map((c) => c.name)
  groupAlphabetically(list)
  assert.deepEqual(list.map((c) => c.name), before)
})

test('rateCafes: group average is the mean of each PERSON\'s own average, not a flat mean of every visit', () => {
  const java = cafe('Java House')
  const visits = [
    // me: two visits, average 4.5 — should count once, not twice, toward the group average
    { cafe_id: java.id, user_id: 'me', overall: 4 }, { cafe_id: java.id, user_id: 'me', overall: 5 },
    { cafe_id: java.id, user_id: 'zeba', overall: 3 },
  ]
  const [row] = rateCafes([java], visits, 'me', nameOf)
  // (4.5 + 3) / 2 = 3.75 — NOT (4+5+3)/3 = 4
  assert.ok(Math.abs(row.average - 3.75) < 1e-9)
  assert.equal(row.peopleCount, 2)
})

test('rateCafes: "You" always leads the people list when present', () => {
  const java = cafe('Java House')
  const visits = [
    { cafe_id: java.id, user_id: 'zeba', overall: 4 }, { cafe_id: java.id, user_id: 'zeba', overall: 4 },
    { cafe_id: java.id, user_id: 'me', overall: 3 },
  ]
  const [row] = rateCafes([java], visits, 'me', nameOf)
  assert.equal(row.people[0].name, 'You')
  assert.equal(row.people[1].name, 'Zeba')
})

test('rateCafes: a cafe nobody rated (or nobody visited) is left out entirely', () => {
  const rated = cafe('Java House')
  const unrated = cafe('Second Cup')
  const visits = [{ cafe_id: rated.id, user_id: 'zeba', overall: 4 }, { cafe_id: unrated.id, user_id: 'zeba', overall: null }]
  const out = rateCafes([rated, unrated, cafe('Nobody Here')], visits, 'me', nameOf)
  assert.deepEqual(out.map((c) => c.name), ['Java House'])
})

test('sortRatedCafes: "people" sorts by most people then rating; "rating" sorts by average then people', () => {
  const a = { ...cafe('A'), average: 4.0, peopleCount: 2, people: [] }
  const b = { ...cafe('B'), average: 4.5, peopleCount: 3, people: [] }
  const c = { ...cafe('C'), average: 4.8, peopleCount: 1, people: [] }
  assert.deepEqual(sortRatedCafes([a, b, c], 'people').map((x) => x.name), ['B', 'A', 'C'])
  assert.deepEqual(sortRatedCafes([a, b, c], 'rating').map((x) => x.name), ['C', 'B', 'A'])
})
