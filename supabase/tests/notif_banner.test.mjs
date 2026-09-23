// Tests app/src/lib/notifBanner.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/notif_banner.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowNotifBanner } from '../../app/src/lib/notifBanner.ts'

test('shows while notifications are off', () => {
  assert.equal(shouldShowNotifBanner('off'), true)
})

test('shows while notifications are blocked (still needs fixing)', () => {
  assert.equal(shouldShowNotifBanner('blocked'), true)
})

test('hides once notifications are actually on', () => {
  assert.equal(shouldShowNotifBanner('on'), false)
})

test('hides where push is not possible at all, and while still checking', () => {
  assert.equal(shouldShowNotifBanner('unsupported'), false)
  assert.equal(shouldShowNotifBanner('checking'), false)
})
