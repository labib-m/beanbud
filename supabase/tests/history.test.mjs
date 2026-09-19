// Tests the wording of a cafe's page history.  Run: node --test supabase/tests/history.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeRevision } from '../../app/src/lib/history.ts'

const rev = (o) => ({ id: 'r', kind: 'edited', address: null, map_url: null, prev_address: null, prev_map_url: null, changed_at: '2026-09-20T00:00:00Z', changed_by: 'u', ...o })

test('created and listed', () => {
  assert.equal(describeRevision(rev({ kind: 'created' })), 'added the cafe')
  assert.equal(describeRevision(rev({ kind: 'listed' })), 'added the cafe to the directory')
})

test('address: added, changed, removed', () => {
  assert.equal(describeRevision(rev({ address: '9 New St' })), 'added the address “9 New St”')
  assert.equal(describeRevision(rev({ prev_address: '1 Old Rd', address: '9 New St' })), 'changed the address from “1 Old Rd” to “9 New St”')
  assert.equal(describeRevision(rev({ prev_address: '1 Old Rd', address: null })), 'removed the address (it was “1 Old Rd”)')
})

test('map link: never prints the URL', () => {
  assert.equal(describeRevision(rev({ map_url: 'https://maps.example/long/url' })), 'added a map link')
  assert.equal(describeRevision(rev({ prev_map_url: 'https://a.example', map_url: 'https://b.example' })), 'changed the map link')
  assert.equal(describeRevision(rev({ prev_map_url: 'https://a.example', map_url: null })), 'removed the map link')
  assert.ok(!describeRevision(rev({ prev_map_url: 'https://a.example', map_url: 'https://b.example' })).includes('http'))
})

test('both at once, joined; and an edit with no visible difference still reads sensibly', () => {
  assert.equal(
    describeRevision(rev({ prev_address: 'A', address: 'B', prev_map_url: null, map_url: 'https://m.example' })),
    'changed the address from “A” to “B” and added a map link',
  )
  assert.equal(describeRevision(rev({})), 'edited the cafe')
})

test('empty strings count as nothing (same as null)', () => {
  assert.equal(describeRevision(rev({ prev_address: '', address: '9 New St' })), 'added the address “9 New St”')
  assert.equal(describeRevision(rev({ prev_address: '', address: '' })), 'edited the cafe')
})
