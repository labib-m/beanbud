// Tests app/src/lib/announcements.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/announcements.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextToShow } from '../../app/src/lib/announcements.ts'

const a = (id, date) => ({ id, created_at: date })

test('nextToShow: the newest one not yet dismissed', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.equal(nextToShow(list, []).id, '2')
})

test('nextToShow: skips dismissed ones, still picking the newest of what remains', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.equal(nextToShow(list, ['2']).id, '3')
})

test('nextToShow: null once everything has been dismissed, or there is nothing at all', () => {
  const list = [a('1', '2026-09-01')]
  assert.equal(nextToShow(list, ['1']), null)
  assert.equal(nextToShow([], []), null)
})
