// Tests app/src/lib/reactions.ts.  Run: node --test supabase/tests/reactions.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextReaction, tally, withMyReaction } from '../../app/src/lib/reactions.ts'

const r = (visit_id, user_id, kind = 'love') => ({ visit_id, user_id, kind })

test('tally: counts loves per visit and finds your own', () => {
  const t = tally([r('v1', 'a'), r('v1', 'b'), r('v1', 'me'), r('v2', 'a')], 'me')
  assert.deepEqual(t.get('v1').counts, { love: 3 })
  assert.equal(t.get('v1').mine, 'love')
  assert.equal(t.get('v2').mine, null)
  assert.equal(t.get('v3'), undefined)
})

test('nextReaction: tapping the heart again removes it, tapping with none adds it', () => {
  assert.equal(nextReaction('love', 'love'), null)
  assert.equal(nextReaction(null, 'love'), 'love')
})

test('withMyReaction: adds and removes yours without touching other people\'s counts', () => {
  const start = tally([r('v', 'a'), r('v', 'me')], 'me').get('v')
  assert.deepEqual(withMyReaction(start, null).counts, { love: 1 })
  assert.equal(withMyReaction(start, null).mine, null)
  assert.deepEqual(withMyReaction(undefined, 'love'), { counts: { love: 1 }, mine: 'love' })
})
