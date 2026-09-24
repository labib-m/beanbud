// Tests app/src/lib/announcements.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/announcements.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sortNewest, unreadCount } from '../../app/src/lib/announcements.ts'

const a = (id, date) => ({ id, created_at: date })

test('sortNewest: newest first', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.deepEqual(sortNewest(list).map((x) => x.id), ['2', '3', '1'])
})

test('unreadCount: everything is unread when nothing has been seen yet', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.equal(unreadCount(list, null), 3)
})

test('unreadCount: counts only what is newer than the last seen one', () => {
  const list = [a('1', '2026-09-01'), a('2', '2026-09-10'), a('3', '2026-09-05')]
  assert.equal(unreadCount(list, '3'), 1) // only '2' is newer than '3'
  assert.equal(unreadCount(list, '2'), 0) // '2' is the newest: fully caught up
})

test('unreadCount: a last-seen id that no longer exists (deleted) is treated as everything unread; an empty list is 0', () => {
  assert.equal(unreadCount([a('1', '2026-09-01')], 'gone'), 1)
  assert.equal(unreadCount([], null), 0)
})
