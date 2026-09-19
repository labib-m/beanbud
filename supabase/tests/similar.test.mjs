// Tests the "did you mean...?" duplicate check.  Run: node --test supabase/tests/similar.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { similarCafes, squash, squashLink } from '../../app/src/lib/similar.ts'

let n = 0
const cafe = (name, city, area, map_url = null) => ({ id: 'c' + ++n, name, city, area, map_url })
const input = (name, city = 'Dhaka', area = 'Banani', mapUrl = '') => ({ name, city, area, mapUrl })

test('squash ignores case, punctuation, spaces and accents', () => {
  assert.equal(squash('Dose-Espresso!'), squash('dose espresso'))
  assert.equal(squash('Café Élan'), 'cafeelan')
})

test('squashLink ignores protocol, www, fragment and trailing slash', () => {
  assert.equal(squashLink('HTTPS://www.Maps.example/abc/#x'), 'maps.example/abc')
  assert.equal(squashLink('http://maps.example/abc'), squashLink('https://maps.example/abc/'))
})

test('the same map link means possibly the same cafe, even with a different name', () => {
  const known = [cafe('Dose Espresso', 'Dhaka', 'Banani', 'https://maps.app.goo.gl/AbC123')]
  const r = similarCafes(input('Dose Coffee Roasters', 'Dhaka', 'Gulshan', 'http://maps.app.goo.gl/AbC123/'), known)
  assert.equal(r.length, 1)
  assert.equal(r[0].reason, 'same-map-link')
})

test('a very similar name in the same city is suggested; a different city is not', () => {
  const known = [cafe('Dose Espresso', 'Dhaka', 'Banani'), cafe('Dose Espresso', 'Bangkok', 'Sathon')]
  const r = similarCafes(input('Dose', 'Dhaka', 'Gulshan'), known)   // "Dose" is contained in "Dose Espresso"... but too short (4 chars is the minimum: exactly 4 passes)
  assert.deepEqual(r.map((x) => x.cafe.city), ['Dhaka'])
  assert.equal(r[0].reason, 'similar-name')
})

test('the same name written differently in another neighbourhood is suggested (a branch, or a typo in the area)', () => {
  const known = [cafe('Second Cup', 'Dhaka', 'Dhanmondi')]
  assert.equal(similarCafes(input('second-cup', 'dhaka', 'Gulshan 2'), known).length, 1)
})

test('an exact match (same name, city AND neighbourhood) is not "similar": it is the existing cafe', () => {
  const known = [cafe('Dose Espresso', 'Dhaka', 'Banani', 'https://maps.example/x')]
  assert.deepEqual(similarCafes(input('  dose ESPRESSO ', 'dhaka', 'BANANI', 'https://maps.example/x'), known), [])
})

test('unrelated cafes and very short names give no suggestions', () => {
  const known = [cafe('Arabica Coffee', 'Dhaka', 'Banani'), cafe('Barock Cafe', 'Dhaka', 'Gulshan')]
  assert.deepEqual(similarCafes(input('Dose Espresso'), known), [])
  assert.deepEqual(similarCafes(input('Do'), known), [])
  assert.deepEqual(similarCafes(input(''), known), [])
})

test('a short name does not match by accident (needs 4+ characters to count as "contained")', () => {
  const known = [cafe('Cafe Bar Deluxe', 'Dhaka', 'Banani')]
  assert.deepEqual(similarCafes(input('Bar', 'Dhaka', 'Gulshan'), known), [])
})

test('results are unique per cafe, map-link matches come first, and it stops at the limit', () => {
  const link = 'https://maps.example/same'
  const known = [
    cafe('Dose Cafe One', 'Dhaka', 'A'), cafe('Dose Cafe Two', 'Dhaka', 'B', link),
    cafe('Dose Cafe Three', 'Dhaka', 'C'), cafe('Dose Cafe Four', 'Dhaka', 'D'), cafe('Dose Cafe Five', 'Dhaka', 'E'),
  ]
  const r = similarCafes(input('Dose Cafe', 'Dhaka', 'Z', link), known, 3)
  assert.equal(r.length, 3)
  assert.equal(r[0].reason, 'same-map-link')
  assert.equal(new Set(r.map((x) => x.cafe.id)).size, 3)
})
