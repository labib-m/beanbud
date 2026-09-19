// Tests which address fields the form offers as editable.
// Run:  node --test supabase/tests/cafe_rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cafeFieldLocks } from '../../app/src/lib/cafeRules.ts'

const ME = 'me', OTHER = 'someone-else'
const cafe = (address, map_url, created_by) => ({ address, map_url, created_by })

test('a brand-new cafe (no match) has nothing locked', () => {
  assert.deepEqual(cafeFieldLocks(undefined, ME), { iAddedIt: false, addressLocked: false, mapLocked: false })
})

test('a cafe I added: nothing is locked, even with values saved', () => {
  const l = cafeFieldLocks(cafe('12 Road', 'https://m.example', ME), ME)
  assert.equal(l.iAddedIt, true)
  assert.equal(l.addressLocked, false)
  assert.equal(l.mapLocked, false)
})

test("someone else's cafe with BLANK fields: both open, so anyone can fill them in", () => {
  for (const blank of [null, '']) {
    const l = cafeFieldLocks(cafe(blank, blank, OTHER), ME)
    assert.equal(l.addressLocked, false, 'blank address must be editable')
    assert.equal(l.mapLocked, false, 'blank map link must be editable')
  }
})

test("someone else's cafe with fields saved: both locked", () => {
  const l = cafeFieldLocks(cafe('12 Road', 'https://m.example', OTHER), ME)
  assert.equal(l.addressLocked, true)
  assert.equal(l.mapLocked, true)
})

test('the two fields are decided independently', () => {
  const a = cafeFieldLocks(cafe('12 Road', null, OTHER), ME)
  assert.deepEqual([a.addressLocked, a.mapLocked], [true, false])   // address saved, map blank: can add the map
  const b = cafeFieldLocks(cafe(null, 'https://m.example', OTHER), ME)
  assert.deepEqual([b.addressLocked, b.mapLocked], [false, true])   // map saved, address blank: can add the address
})

test('a cafe with no recorded creator (creator account deleted) is treated as someone else\'s', () => {
  const l = cafeFieldLocks(cafe('12 Road', null, null), ME)
  assert.equal(l.iAddedIt, false)
  assert.equal(l.addressLocked, true)
  assert.equal(cafeFieldLocks(cafe(null, null, undefined), ME).addressLocked, false)
})
