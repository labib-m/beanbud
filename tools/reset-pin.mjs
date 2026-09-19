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
const ESC = String.fromCharCode(27)
function askHidden(prompt) {
  if (!process.stdin.isTTY) return Promise.resolve('')
  return new Promise((resolve) => {
    let typed = ''
    process.stdout.write(prompt)
    process.stdin.setRawMode(true) // keystrokes come to us directly; the terminal echoes nothing
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    function finish(value) {
      process.stdin.removeListener('data', onData)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      // Show only how many characters were read (never the key itself). A generated key is 64.
      process.stdout.write('\n  read ' + value.length + ' characters\n')
      resolve(value)
    }
    function onData(chunk) {
      // Some terminals wrap pasted text in "bracketed paste" markers (ESC[200~ ... ESC[201~).
      // Drop them so they never end up inside the key.
      chunk = chunk.split(ESC + '[200~').join('').split(ESC + '[201~').join('')
      // a paste arrives as one chunk, so walk it character by character
      for (const ch of chunk) {
        const code = ch.charCodeAt(0)
        if (ch === '\r' || ch === '\n') return finish(typed.trim())
        if (code === 3) { process.stdout.write('\n'); process.exit(130) } // Ctrl+C
        if (code === 127 || code === 8) typed = typed.slice(0, -1) // Backspace
        else if (code >= 32) typed += ch
      }
    }
    process.stdin.on('data', onData)
  })
}
const adminKey = env.ADMIN_KEY || (await askHidden('Admin key (hidden): '))
if (!adminKey) fail('No admin key. Set ADMIN_KEY in the environment, or run this in a terminal to be prompted.')
// Wrong guesses count toward a lock-out, so don't send something that is clearly not a generated key (64 characters).
if (!env.ADMIN_KEY && adminKey.length !== 64) {
  fail('Read ' + adminKey.length + ' characters, but a generated admin key has 64. Nothing was sent, so no attempt was used. Paste the key again.')
}

// --- do it
const target = who.includes('@') && !who.startsWith('@') ? { email: who } : { username: who.replace(/^@/, '') }
let res
try {
  res = await fetch(url + '/functions/v1/pin-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: 'Bearer ' + anon },
    body: JSON.stringify({ action: 'admin-reset-pin', admin_key: adminKey, pin, ...target }),
  })
} catch {
  fail('Could not reach ' + url + '. Check your internet connection.')
}
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
