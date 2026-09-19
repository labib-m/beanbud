// Tests the A-Z directory logic.  Run: node --test supabase/tests/directory.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupAlphabetically, letterOf, matchesQuery } from '../../app/src/lib/directory.ts'

let n = 0
const cafe = (name, area = 'Banani', city = 'Dhaka') => ({ id: 'c' + ++n, name, area, city })

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
