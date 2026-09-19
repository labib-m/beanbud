#!/usr/bin/env node
// Bean Bud — give someone a temporary PIN (for people who forgot theirs).
//
//   node tools/reset-pin.mjs <username|email> [temporary PIN]
//
// If you leave out the PIN, a random 4-digit one is chosen and printed.
// Tell the person the temporary PIN privately. When they sign in with it,
// the app makes them choose their own straight away.
//
// It needs your ADMIN_KEY (the secret you set on the pin-auth function).
// Put it in the environment, or leave it out and you'll be asked for it
// (typing is hidden). Don't put it on the command line, where it would be
// saved in your shell history.
//
// The project address and public key are read from app/.env.local.

import { readFileSync } from 'node:fs'
import { randomInt } from 'node:crypto'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const PIN_LENGTH = 4 // keep in step with the function and the app

function fail(msg) {
  console.error('\n' + msg + '\n')
  process.exit(1)
}

const [who, givenPin] = process.argv.slice(2)
if (!who || who === '--help' || who === '-h') {
  console.log('Usage: node tools/reset-pin.mjs <username|email> [temporary PIN]')
  process.exit(who ? 0 : 1)
}

// --- project address + public key
function readEnv() {
  const env = { ...process.env }
  try {
    const file = readFileSync(fileURLToPath(new URL('../app/.env.local', import.meta.url)), 'utf8')
    for (const line of file.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].trim()
    }
  } catch {
    // fall back to the environment
  }
  return env
}
const env = readEnv()
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) fail('Could not find VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in app/.env.local.')

// --- the temporary PIN
const pin = givenPin ?? String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0')
if (!new RegExp('^\\d{' + PIN_LENGTH + '}$').test(pin)) fail('The PIN must be exactly ' + PIN_LENGTH + ' digits.')

// --- the admin key: from the environment, or asked for with typing hidden
function askHidden(prompt) {
  if (!process.stdin.isTTY) return Promise.resolve('')
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      // show the question, but echo nothing while the key is typed
      if (s.includes(prompt)) process.stdout.write(s)
    }
    rl.question(prompt, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}
const adminKey = env.ADMIN_KEY || (await askHidden('Admin key (hidden): '))
if (!adminKey) fail('No admin key. Set ADMIN_KEY in the environment, or run this in a terminal to be prompted.')

// --- do it
const target = who.includes('@') && !who.startsWith('@') ? { email: who } : { username: who.replace(/^@/, '') }
const res = await fetch(url + '/functions/v1/pin-auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: 'Bearer ' + anon },
  body: JSON.stringify({ action: 'admin-reset-pin', admin_key: adminKey, pin, ...target }),
})
const body = await res.json().catch(() => ({}))

if (res.ok && body.ok) {
  console.log('\nDone. ' + (body.username ? '@' + body.username : who) + ' can now sign in with the temporary PIN:\n\n    ' + pin + '\n')
  console.log('They will be asked to choose their own PIN straight after signing in.\n')
} else if (res.status === 404) {
  fail('No account found for "' + who + '".')
} else if (res.status === 403 && body.reason === 'disabled') {
  fail('Resets are switched off: the ADMIN_KEY secret is not set on the pin-auth function.')
} else if (res.status === 403) {
  fail('That admin key is not right.')
} else if (res.status === 429) {
  fail('Too many wrong admin-key tries. Locked for about ' + (body.minutes ?? 15) + ' minutes.')
} else {
  fail('The reset failed (HTTP ' + res.status + '). Check that the latest pin-auth code is deployed.')
}
