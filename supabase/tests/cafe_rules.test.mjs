// Tests the visit form's cafe-details rules.  Run: node --test supabase/tests/cafe_rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detailsAreLocked, newCafeProblem } from '../../app/src/lib/cafeRules.ts'

test('an existing cafe\'s details are read-only in the visit form; a new cafe\'s are not', () => {
  assert.equal(detailsAreLocked(undefined), false)
  assert.equal(detailsAreLocked({ id: 'x' }), true)
})

test('a new cafe needs an address and a map link', () => {
  assert.match(newCafeProblem('', 'https://maps.example/x'), /address/i)
  assert.match(newCafeProblem('   ', 'https://maps.example/x'), /address/i)
  assert.match(newCafeProblem('1 Road', ''), /map link/i)
  assert.match(newCafeProblem('1 Road', '   '), /map link/i)
  assert.equal(newCafeProblem('1 Road', 'https://maps.app.goo.gl/abc'), null)
  assert.equal(newCafeProblem(' 1 Road ', ' HTTP://maps.example/x '), null)
})

test('a map link must be a web link', () => {
  for (const bad of ['maps.google.com/x', 'ftp://x.example', 'javascript:alert(1)', 'just some words']) {
    assert.match(newCafeProblem('1 Road', bad), /http/i, bad)
  }
})
