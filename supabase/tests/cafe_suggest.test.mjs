// Tests app/src/lib/cafeSuggest.ts.  Run: node --test supabase/tests/cafe_suggest.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { areaMatches, cityMatches, nameMatches } from '../../app/src/lib/cafeSuggest.ts'

const cafes = [
  { name: 'Dose Espresso', city: 'Dhaka', area: 'Banani' },
  { name: 'Second Cup', city: 'Dhaka', area: 'Dhanmondi' },
  { name: 'Dose 2', city: 'Dhaka', area: 'Gulshan 2' },
  { name: 'Baan Saen Saep', city: 'Bangkok', area: 'Pathum Wan' },
]

test('nameMatches: case/space-insensitive substring, capped, nothing for a blank query', () => {
  assert.deepEqual(nameMatches(cafes, 'dose').map((c) => c.name), ['Dose Espresso', 'Dose 2'])
  assert.deepEqual(nameMatches(cafes, '  DOSE  '), nameMatches(cafes, 'dose'))
  assert.equal(nameMatches(cafes, 'dose', 1).length, 1)
  assert.deepEqual(nameMatches(cafes, ''), [])
})

test('cityMatches: distinct, alphabetical, filtered by the query; blank query suggests nothing', () => {
  assert.deepEqual(cityMatches(cafes, 'a'), ['Bangkok', 'Dhaka'])
  assert.deepEqual(cityMatches(cafes, 'dha'), ['Dhaka'])
  assert.deepEqual(cityMatches(cafes, ''), [])
  assert.deepEqual(cityMatches(cafes, 'zzz'), [])
})

test('areaMatches: distinct, alphabetical, scoped to the given city when one is filled in', () => {
  assert.deepEqual(areaMatches(cafes, 'Dhaka', 'a'), ['Banani', 'Dhanmondi', 'Gulshan 2'])
  assert.deepEqual(areaMatches(cafes, '', 'a'), ['Banani', 'Dhanmondi', 'Gulshan 2', 'Pathum Wan'])
  assert.deepEqual(areaMatches(cafes, 'Bangkok', 'a'), ['Pathum Wan'])
  assert.deepEqual(areaMatches(cafes, 'Dhaka', ''), [])
})
