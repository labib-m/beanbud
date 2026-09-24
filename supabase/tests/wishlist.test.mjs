// Tests app/src/lib/wishlist.ts.  Run: node --test supabase/tests/wishlist.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stillToTry } from '../../app/src/lib/wishlist.ts'

const item = (cafe_id) => ({ cafe_id })

test('stillToTry: keeps unvisited bookmarks in order, drops cafes you have logged a visit at', () => {
  const list = [item('a'), item('b'), item('c')]
  assert.deepEqual(stillToTry(list, ['b']).map((i) => i.cafe_id), ['a', 'c'])
  assert.deepEqual(stillToTry(list, new Set(['a', 'b', 'c'])), [])
  assert.deepEqual(stillToTry(list, []).map((i) => i.cafe_id), ['a', 'b', 'c'])
})
