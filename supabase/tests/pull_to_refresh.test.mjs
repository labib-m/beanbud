// Tests app/src/lib/pullToRefresh.ts.  Run: node --test supabase/tests/pull_to_refresh.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PULL_MAX, PULL_THRESHOLD, pullDistance, pullPhase } from '../../app/src/lib/pullToRefresh.ts'

test('pullDistance: nothing for an upward or zero drag, lags the finger, and stops at the max', () => {
  assert.equal(pullDistance(-40), 0)
  assert.equal(pullDistance(0), 0)
  assert.equal(pullDistance(50), 30)
  assert.equal(pullDistance(1000), PULL_MAX)
})

test('pullPhase: idle, then pull, then release once the threshold is reached', () => {
  assert.equal(pullPhase(0), 'idle')
  assert.equal(pullPhase(PULL_THRESHOLD - 1), 'pull')
  assert.equal(pullPhase(PULL_THRESHOLD), 'release')
  assert.equal(pullPhase(PULL_MAX), 'release')
})
