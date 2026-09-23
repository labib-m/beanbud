// Tests app/src/lib/addToHomeScreen.ts (pure logic only) in Node.
// Run:  node --test supabase/tests/add_to_home_screen.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isIOSDevice, shouldShowGuide } from '../../app/src/lib/addToHomeScreen.ts'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
const IPAD_MODERN = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15' // iPadOS 13+ disguise
const MAC = IPAD_MODERN
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'

test('isIOSDevice: iPhone and iPod user agents are iOS', () => {
  assert.equal(isIOSDevice(IPHONE, 0), true)
  assert.equal(isIOSDevice('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)', 0), true)
})

test('isIOSDevice: a touch-capable "Mac" is iPadOS 13+, a mouse-only Mac is a real Mac', () => {
  assert.equal(isIOSDevice(IPAD_MODERN, 5), true)
  assert.equal(isIOSDevice(MAC, 0), false)
})

test('isIOSDevice: Android is not iOS', () => {
  assert.equal(isIOSDevice(ANDROID, 5), false)
})

test('shouldShowGuide: shows only for a fresh sign-up, on iOS, in a browser tab, not seen before', () => {
  const base = { justSignedUp: true, seen: false, isIOS: true, isStandalone: false }
  assert.equal(shouldShowGuide(base), true)
  assert.equal(shouldShowGuide({ ...base, justSignedUp: false }), false) // an existing user signing in
  assert.equal(shouldShowGuide({ ...base, seen: true }), false)          // already dismissed it once
  assert.equal(shouldShowGuide({ ...base, isIOS: false }), false)        // Android / desktop: not targeted
  assert.equal(shouldShowGuide({ ...base, isStandalone: true }), false)  // already opened from the Home Screen
})
