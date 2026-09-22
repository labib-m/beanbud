// Tests the pure parts of the send-push Edge Function in Node.
// Run:  node --test supabase/tests/send_push.test.mjs
// It loads the real function file, minus its two Deno-only import lines and the
// setVapidDetails() call that needs real keys (the network calls are not exercised here).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const src = readFileSync(new URL('../functions/send-push/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*jsr:.*$/m, 'const createClient = () => { throw new Error("not used in tests") }')
  .replace(/^import webpush from .*npm:.*$/m, 'const webpush = { setVapidDetails() {} }')

const dir = mkdtempSync(join(tmpdir(), 'send-push-'))
const file = join(dir, 'send-push.ts')
writeFileSync(file, src)
const m = await import(file)

test('authorName mirrors app/src/lib/people.ts displayName()', () => {
  assert.equal(m.authorName({ display_name: 'Nabila Haque', handle: 'nabs' }), 'Nabila Haque')
  assert.equal(m.authorName({ display_name: '  ', handle: 'nabs' }), '@nabs')
  assert.equal(m.authorName({ display_name: null, handle: 'nabs' }), '@nabs')
  assert.equal(m.authorName({ display_name: null, handle: null }), 'Someone')
  assert.equal(m.authorName(null), 'Someone')
})

test('notificationFor: a new visit says "logged" and links to the cafe page', () => {
  const n = m.notificationFor('INSERT', { id: 'c1', name: 'Dose Espresso' }, 'Nabila Haque')
  assert.equal(n.title, 'Bean Bud')
  assert.equal(n.body, 'Nabila Haque logged Dose Espresso')
  assert.equal(n.url, '/cafes/c1')
})

test('notificationFor: editing an existing visit says "updated"', () => {
  const n = m.notificationFor('UPDATE', { id: 'c1', name: 'Dose Espresso' }, '@nabs')
  assert.equal(n.body, '@nabs updated their visit to Dose Espresso')
  assert.equal(n.url, '/cafes/c1')
})
