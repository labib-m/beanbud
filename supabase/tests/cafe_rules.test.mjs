// Tests the visit form's cafe-details rules.  Run: node --test supabase/tests/cafe_rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkDetailsUpdate, newCafeProblem } from '../../app/src/lib/cafeRules.ts'

test('a new cafe needs an address and a map link', () => {
  assert.match(newCafeProblem('', 'https://maps.example/x'), /address/i)
  assert.match(newCafeProblem('   ', 'https://maps.example/x'), /address/i)
  assert.match(newCafeProblem('1 Road', ''), /map link/i)
  assert.equal(newCafeProblem('1 Road', 'https://maps.app.goo.gl/abc'), null)
  assert.equal(newCafeProblem(' 1 Road ', ' HTTP://maps.example/x '), null)
})

test('a map link must be a web link', () => {
  for (const bad of ['maps.google.com/x', 'ftp://x.example', 'javascript:alert(1)', 'just some words']) {
    assert.match(newCafeProblem('1 Road', bad), /http/i, bad)
  }
})

const saved = { address: '1 Old Road', map_url: 'https://maps.example/old' }

test('existing cafe, nothing touched: no change', () => {
  const c = checkDetailsUpdate(saved, '1 Old Road', 'https://maps.example/old')
  assert.deepEqual([c.changed, c.canUpdate, c.problem], [false, false, null])
})

test('extra spaces around the same values are not a change', () => {
  assert.equal(checkDetailsUpdate(saved, '  1 Old Road  ', ' https://maps.example/old ').changed, false)
})

test('a blank box keeps the saved value: never erases, never counts as a change', () => {
  const c = checkDetailsUpdate(saved, '', '   ')
  assert.equal(c.address, '1 Old Road')
  assert.equal(c.mapUrl, 'https://maps.example/old')
  assert.deepEqual([c.changed, c.canUpdate], [false, false])
})

test('a real change needs confirming; a blank in the other box keeps its saved value', () => {
  const a = checkDetailsUpdate(saved, '9 New Street', '')
  assert.deepEqual([a.changed, a.canUpdate, a.addressChanged, a.mapChanged], [true, true, true, false])
  assert.equal(a.address, '9 New Street')
  assert.equal(a.mapUrl, 'https://maps.example/old')
  const b = checkDetailsUpdate(saved, '', 'https://maps.example/new')
  assert.deepEqual([b.canUpdate, b.addressChanged, b.mapChanged], [true, false, true])
  assert.equal(b.address, '1 Old Road')
})

test('a map link that is not a web link is a problem and cannot be applied', () => {
  const c = checkDetailsUpdate(saved, '9 New Street', 'maps.example/no-scheme')
  assert.match(c.problem, /http/i)
  assert.equal(c.canUpdate, false)
})

test('a cafe with nothing saved yet (older test data): both must end up filled in to apply', () => {
  const empty = { address: null, map_url: null }
  assert.equal(checkDetailsUpdate(empty, '', '').changed, false)
  const onlyAddress = checkDetailsUpdate(empty, '9 New Street', '')
  assert.deepEqual([onlyAddress.changed, onlyAddress.canUpdate], [true, false])   // still saves the visit, just no directory update
  const both = checkDetailsUpdate(empty, '9 New Street', 'https://maps.example/new')
  assert.deepEqual([both.changed, both.canUpdate], [true, true])
  const half = { address: '1 Road', map_url: null }
  assert.equal(checkDetailsUpdate(half, '', 'https://maps.example/new').canUpdate, true)   // completes it
})
