// Tests the pure part of app/src/lib/push.ts (URL-safe base64 -> bytes) in Node.
// Run:  node --test supabase/tests/push.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { urlBase64ToUint8Array } from '../../app/src/lib/pushKey.ts'

test('decodes plain base64', () => {
  // "hi" -> base64 "aGk="
  assert.deepEqual([...urlBase64ToUint8Array('aGk=')], [104, 105])
})

test('decodes URL-safe base64 with - and _ and missing padding', () => {
  // bytes [0xff, 0xff, 0xbe] -> base64 "//++" -> url-safe "__--" without the trailing "=" padding removed here
  const bytes = [0xff, 0xff, 0xbe]
  const std = Buffer.from(bytes).toString('base64') // "//++"... exact value doesn't matter, just round-trip it
  const urlSafe = std.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  assert.deepEqual([...urlBase64ToUint8Array(urlSafe)], bytes)
})

test('length matches a real VAPID public key (65 raw bytes, uncompressed P-256 point)', () => {
  // A real key starts with 0x04 (uncompressed point marker) and is 65 bytes long.
  const key = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxaZs2Jonaggzn3ULn7cX3_zi3Bvz1WD5J6WdMfP6iVoU5nT0v9c'
  const bytes = urlBase64ToUint8Array(key)
  assert.equal(bytes.length, 65)
  assert.equal(bytes[0], 4)
})
