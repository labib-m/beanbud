// Tests app/src/lib/announcements.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/announcements.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sortNewest, isUnread } from '../../app/src/lib/announcements.ts'

const a = (id, date) => ({ id, created_at: date })

test('sortNewest: newest first', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.deepEqual(sortNewest(list).map((x) => x.id), ['2', '3', '1'])
})

test('isUnread: true when the newest id differs from what was last seen', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10')]
  assert.equal(isUnread(list, '1'), true)
  assert.equal(isUnread(list, null), true)
})

test('isUnread: false once the newest one has been seen, or there is nothing at all', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10')]
  assert.equal(isUnread(list, '2'), false)
  assert.equal(isUnread([], null), false)
})
