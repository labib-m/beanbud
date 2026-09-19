// Tests the pure parts of the pin-auth Edge Function in Node.
// Run:  node --test supabase/tests/pin_auth.test.mjs
// It loads the real function file, minus its one Deno-only import line
// (the network calls are not exercised here, only the logic).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const src = readFileSync(new URL('../functions/pin-auth/index.ts', import.meta.url), 'utf8')
  .replace(/^import .*jsr:.*$/m, 'const createClient = () => { throw new Error("not used in tests") }')
const dir = mkdtempSync(join(tmpdir(), 'pin-auth-'))
const file = join(dir, 'pin-auth.ts')
writeFileSync(file, src)
const m = await import(file)

test('usernames are normalised and validated', () => {
  assert.equal(m.normaliseHandle('@Labib'), 'labib')
  assert.equal(m.normaliseHandle('  nabs.x_y-1 '), 'nabs.x_y-1')
  assert.equal(m.normaliseHandle('a'), null)
  assert.equal(m.normaliseHandle('x'.repeat(25)), null)
  assert.equal(m.normaliseHandle('has space'), null)
  assert.equal(m.normaliseHandle("o'brien"), null)
  assert.equal(m.normaliseHandle(undefined), null)
})

test('PIN must be exactly PIN_LENGTH digits, as a string', () => {
  assert.equal(m.PIN_LENGTH, 4)
  assert.equal(m.pinIsValid('1234'), true)
  assert.equal(m.pinIsValid('0000'), true)
  assert.equal(m.pinIsValid('123'), false)
  assert.equal(m.pinIsValid('12345'), false)
  assert.equal(m.pinIsValid('12a4'), false)
  assert.equal(m.pinIsValid(1234), false)
  assert.equal(m.pinIsValid('123 '), false)
  assert.equal(m.pinIsValid(null), false)
})

test('ilike wildcards in usernames are escaped', () => {
  assert.equal(m.escapeLike('a_b%c\\d'), 'a\\_b\\%c\\\\d')
  assert.equal(m.escapeLike('plain'), 'plain')
})

test('derived password: stable, long enough, and depends on pepper, user and PIN', async () => {
  const a = await m.derivePassword('pepper-1', 'user-1', '1234')
  assert.equal(a, await m.derivePassword('pepper-1', 'user-1', '1234'))
  assert.notEqual(a, await m.derivePassword('pepper-2', 'user-1', '1234'))
  assert.notEqual(a, await m.derivePassword('pepper-1', 'user-2', '1234'))
  assert.notEqual(a, await m.derivePassword('pepper-1', 'user-1', '1235'))
  assert.equal(a.length, 68)              // 64 hex + 4 suffix chars: well inside Supabase's 72-byte limit
  assert.ok(a.length >= 6)
  assert.match(a, /^[0-9a-f]{64}A1!a$/)
  assert.doesNotMatch(a, /1234/)          // the PIN itself is not visible in the password
})

test('all 10,000 PINs give distinct passwords for one user', async () => {
  const seen = new Set()
  for (let i = 0; i < 10000; i++) seen.add(await m.derivePassword('p', 'u', String(i).padStart(4, '0')))
  assert.equal(seen.size, 10000)
})

test('safeEqual: equal only for identical strings', async () => {
  assert.equal(await m.safeEqual('cortado-2026', 'cortado-2026'), true)
  assert.equal(await m.safeEqual('cortado-2026', 'cortado-2027'), false)
  assert.equal(await m.safeEqual('cortado-2026', 'cortado-202'), false)
  assert.equal(await m.safeEqual('', ''), true)
  assert.equal(await m.safeEqual('a', ''), false)
})

test('made-up sign-up address can never receive mail and is unique', () => {
  const a = m.syntheticEmail(), b = m.syntheticEmail()
  assert.match(a, /^u-[0-9a-f-]{36}@users\.beanbud\.invalid$/)
  assert.notEqual(a, b)
})

test('throwaway password is long, random and meets strength rules', () => {
  const a = m.randomPassword(), b = m.randomPassword()
  assert.notEqual(a, b)
  assert.match(a, /^[0-9a-f]{64}A1!a$/)
})

test('limiter keys used by sign-up and admin can never be a real username', () => {
  assert.equal(m.normaliseHandle('~signup'), null)
  assert.equal(m.normaliseHandle('~admin'), null)
})

test('sameSecret ignores stray whitespace and a trailing newline on either side, but nothing else', async () => {
  const key = 'a'.repeat(64)
  assert.equal(await m.sameSecret(key, key), true)
  assert.equal(await m.sameSecret(key, key + '\n'), true)      // stored with the newline from `| pbcopy`
  assert.equal(await m.sameSecret(key + '\n', key), true)
  assert.equal(await m.sameSecret('  ' + key + ' \r\n', key), true)
  assert.equal(await m.sameSecret(key, 'b' + key.slice(1)), false)
  assert.equal(await m.sameSecret(key, key.slice(0, -1)), false)
  assert.equal(await m.sameSecret('ab cd', 'abcd'), false)     // inner spaces still matter
  assert.equal(await m.sameSecret('', ''), true)
})
