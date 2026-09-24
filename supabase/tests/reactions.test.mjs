// Tests app/src/lib/reactions.ts.  Run: node --test supabase/tests/reactions.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextReaction, tally, withMyReaction } from '../../app/src/lib/reactions.ts'

const r = (visit_id, user_id, kind) => ({ visit_id, user_id, kind })

test('tally: counts per visit and finds your own reaction', () => {
  const t = tally([r('v1', 'a', 'love'), r('v1', 'b', 'love'), r('v1', 'me', 'question'), r('v2', 'a', 'dislike')], 'me')
  assert.deepEqual(t.get('v1').counts, { love: 2, question: 1, dislike: 0 })
  assert.equal(t.get('v1').mine, 'question')
  assert.equal(t.get('v2').mine, null)
  assert.equal(t.get('v3'), undefined)
})

test('nextReaction: tapping yours removes it, tapping another switches, tapping with none adds', () => {
  assert.equal(nextReaction('love', 'love'), null)
  assert.equal(nextReaction('love', 'dislike'), 'dislike')
  assert.equal(nextReaction(null, 'question'), 'question')
})

test('withMyReaction: adds, switches and removes without touching other people\'s counts', () => {
  const start = tally([r('v', 'a', 'love'), r('v', 'me', 'love')], 'me').get('v')
  assert.deepEqual(withMyReaction(start, 'dislike').counts, { love: 1, question: 0, dislike: 1 })
  assert.deepEqual(withMyReaction(start, null).counts, { love: 1, question: 0, dislike: 0 })
  assert.equal(withMyReaction(start, null).mine, null)
  assert.deepEqual(withMyReaction(undefined, 'question'), { counts: { love: 0, question: 1, dislike: 0 }, mine: 'question' })
})
