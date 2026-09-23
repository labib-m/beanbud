// Tests app/src/lib/notifBanner.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/notif_banner.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowNotifBanner } from '../../app/src/lib/notifBanner.ts'

test('shows for a new user whose notifications are off', () => {
  assert.equal(shouldShowNotifBanner(true, 'off'), true)
})

test('shows for a new user whose notifications are blocked (they still need to fix it)', () => {
  assert.equal(shouldShowNotifBanner(true, 'blocked'), true)
})

test('never shows for an existing user, regardless of status', () => {
  assert.equal(shouldShowNotifBanner(false, 'off'), false)
  assert.equal(shouldShowNotifBanner(false, 'blocked'), false)
})

test('hides once notifications are actually on', () => {
  assert.equal(shouldShowNotifBanner(true, 'on'), false)
})

test('hides where push is not possible at all, and while still checking', () => {
  assert.equal(shouldShowNotifBanner(true, 'unsupported'), false)
  assert.equal(shouldShowNotifBanner(true, 'checking'), false)
})
