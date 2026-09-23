// Bean Bud — username + PIN accounts (one Edge Function, five actions).
//
//   sign-up         { username, pin, invite }        create an account, return a session
//   sign-in         { username, pin }                check the PIN, return a session
//   set-pin         { pin }                          (signed in) set or change your own PIN
//   delete-account  {}                                (signed in) permanently delete your own account
//   admin-reset-pin { admin_key, username|email, pin }  (developer) give someone a temporary PIN
//
// There is NO email anywhere. Supabase Auth insists every account has an
// email, so new accounts get a made-up address that can never receive mail
// (u-<random>@users.beanbud.invalid). Nobody ever sees or uses it.
//
// How the PIN is protected:
//  * The PIN is never stored. Auth needs a real password (6+ chars), so we
//    turn "user id + PIN" into a long password using a secret only this
//    function knows (PIN_PEPPER). Guessing through Supabase's own login
//    endpoint is useless without that secret.
//  * Every guess goes through here, and each attempt is counted in the
//    database BEFORE it is checked (pin_attempt_begin), so parallel guessing
//    cannot get past the lockout.
//  * Wrong username and wrong PIN give the same answer.
//
// Deploy with "Verify JWT" switched OFF. This project signs users' tokens with
// asymmetric keys (ES256), which the built-in gate rejects (UNAUTHORIZED_ASYMMETRIC_JWT)
// before this code runs. That is safe here because each action does its own check:
// sign-in / sign-up are public by design, set-pin validates the caller's token with
// Supabase Auth, and admin-reset-pin needs ADMIN_KEY.
//
// Secrets you set (SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY are automatic):
//   PIN_PEPPER   long random string. If lost, every PIN stops working.
//   INVITE_CODE  the phrase new people must type to create an account.
//                If unset, sign-up is closed.
//   ADMIN_KEY    long random string that lets YOU reset PINs. If unset,
//                resets are disabled.

import { createClient } from 'jsr:@supabase/supabase-js@2'

export const PIN_LENGTH = 4       // keep in step with PIN_LENGTH in app/src/data/auth.ts
export const MAX_FAILURES = 5     // wrong PINs before a username is locked
export const SIGNUP_MAX_FAILURES = 10
export const ADMIN_MAX_FAILURES = 5
export const BASE_LOCK_MINUTES = 15
export const MAX_LOCK_MINUTES = 24 * 60
// Keys for the shared limiter. They start with ~, which no username can, so
// they can never collide with a real account.
const SIGNUP_KEY = '~signup'
const ADMIN_KEY_NAME = '~admin'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Lower-cased username if it is well formed, otherwise null. */
export function normaliseHandle(raw: unknown): string | null {
  const h = String(raw ?? '').trim().replace(/^@/, '').toLowerCase()
  return /^[a-z0-9_.-]{2,24}$/.test(h) ? h : null
}

export function pinIsValid(pin: unknown): boolean {
  return typeof pin === 'string' && new RegExp('^\\d{' + PIN_LENGTH + '}$').test(pin)
}

// ilike treats _ and % as wildcards; usernames may contain _, so escape them.
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

/**
 * The real Supabase password for a user + PIN: HMAC-SHA256 with the secret
 * pepper, as hex (64 chars), plus a fixed suffix so it also satisfies any
 * "needs upper/lower/digit/symbol" password rule you might switch on.
 */
export async function derivePassword(pepper: string, userId: string, pin: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(userId + ':' + pin))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex + 'A1!a'
}

/** Compares two secrets without leaking, through timing, how much of them matched. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const p = new Uint8Array(x), q = new Uint8Array(y)
  let diff = 0
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i]
  return diff === 0
}

/**
 * Compares a typed secret with a stored one, ignoring stray spaces or a trailing
 * newline on either side (a key copied from a terminal or pasted into a web form
 * often carries one). Used for the invite code and the admin key. Deliberately NOT
 * used for PIN_PEPPER: changing how the pepper is read would change every PIN.
 */
export const sameSecret = (typed: string, stored: string) => safeEqual(typed.trim(), stored.trim())

/** A throwaway strong password, used only for the instant between creating an account and setting the real one. */
export function randomPassword(): string {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('') + 'A1!a'
}

/**
 * A safe, one-line description of a token for logs and error messages: which algorithm
 * signed it, which role it carries, whether it has expired. Never includes the token.
 * (A public "anon" key as the token is the classic sign the app didn't send the user's own.)
 */
export function describeToken(token: string): string {
  if (!token) return 'no token'
  try {
    const decode = (part: string) => {
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
      return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')))
    }
    const [h, p] = token.split('.')
    const header = decode(h), payload = decode(p)
    const expired = typeof payload.exp === 'number' ? (payload.exp * 1000 < Date.now() ? 'yes' : 'no') : 'n/a'
    return 'alg=' + header.alg + ' role=' + payload.role + ' expired=' + expired + ' has_user=' + (payload.sub ? 'yes' : 'no')
  } catch {
    return 'not a readable JWT'
  }
}

/** An address that can never receive mail (.invalid is reserved for exactly that). */
export const syntheticEmail = () => 'u-' + crypto.randomUUID() + '@users.beanbud.invalid'

function clients() {
  const url = Deno.env.get('SUPABASE_URL')!
  const opts = { auth: { persistSession: false } }
  return {
    admin: createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, opts),
    anon: createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, opts),
  }
}
type Admin = ReturnType<typeof clients>['admin']

/** Counts an attempt for `key` before it is checked. Returns a Response if that key is locked, otherwise null. */
async function throttle(admin: Admin, key: string, maxFailures: number): Promise<Response | null> {
  const { data, error } = await admin.rpc('pin_attempt_begin', {
    p_handle: key, p_max_failures: maxFailures, p_base_minutes: BASE_LOCK_MINUTES, p_max_minutes: MAX_LOCK_MINUTES,
  })
  if (error || !data?.[0]) { console.error('pin_attempt_begin failed', error?.message); return json({ ok: false }, 500) }
  if (!data[0].allowed) return json({ ok: false, locked: true, minutes: data[0].minutes_left }, 429)
  return null
}

const clear = (admin: Admin, key: string) => admin.from('login_attempts').delete().eq('handle', key)

function needPepper(): string | null {
  const pepper = Deno.env.get('PIN_PEPPER')
  if (!pepper) console.error('PIN_PEPPER is not set')
  return pepper ?? null
}

async function findUserIdByHandle(admin: Admin, handle: string): Promise<string | null> {
  const { data } = await admin.from('profiles').select('id').ilike('handle', escapeLike(handle)).maybeSingle()
  return data?.id ?? null
}

// ---------------------------------------------------------------- sign-in
async function signIn(body: Record<string, unknown>): Promise<Response> {
  const wrong = () => json({ ok: false }, 401)
  const pepper = needPepper()
  if (!pepper) return json({ ok: false }, 500)

  const handle = normaliseHandle(body.username)
  const pin = body.pin
  if (!handle || !pinIsValid(pin)) return wrong()

  const { admin, anon } = clients()
  const limited = await throttle(admin, handle, MAX_FAILURES)
  if (limited) return limited

  let session: { access_token: string; refresh_token: string } | null = null
  const id = await findUserIdByHandle(admin, handle)
  if (id) {
    const { data: found } = await admin.auth.admin.getUserById(id)
    const email = found?.user?.email
    if (email) {
      const password = await derivePassword(pepper, id, pin as string)
      const { data, error } = await anon.auth.signInWithPassword({ email, password })
      if (!error && data.session) session = data.session
    }
  }
  if (!session) return wrong()   // the attempt is already counted

  await clear(admin, handle)
  return json({ ok: true, access_token: session.access_token, refresh_token: session.refresh_token })
}

// ---------------------------------------------------------------- sign-up
async function signUp(body: Record<string, unknown>): Promise<Response> {
  const pepper = needPepper()
  if (!pepper) return json({ ok: false, reason: 'server' }, 500)
  const invite = Deno.env.get('INVITE_CODE')
  if (!invite) return json({ ok: false, reason: 'closed' }, 403)

  const handle = normaliseHandle(body.username)
  if (!handle) return json({ ok: false, reason: 'username' }, 400)
  if (!pinIsValid(body.pin)) return json({ ok: false, reason: 'pin' }, 400)
  const pin = body.pin as string

  const { admin, anon } = clients()
  const limited = await throttle(admin, SIGNUP_KEY, SIGNUP_MAX_FAILURES)   // guessing the invite code is throttled
  if (limited) return limited
  if (!(await sameSecret(String(body.invite ?? ''), invite))) return json({ ok: false, reason: 'invite' }, 403)

  if (await findUserIdByHandle(admin, handle)) return json({ ok: false, reason: 'taken' }, 409)

  // 1. The account, with a throwaway password. Confirmed already: no email is ever sent.
  const email = syntheticEmail()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: randomPassword(), email_confirm: true, app_metadata: { has_pin: true },
  })
  if (createError || !created?.user) { console.error('createUser failed', createError?.message); return json({ ok: false, reason: 'server' }, 500) }
  const id = created.user.id
  const undo = () => admin.auth.admin.deleteUser(id)   // if anything below fails, leave no half-made account

  // 2. The real password, derived from this user's id and PIN.
  const password = await derivePassword(pepper, id, pin)
  const { error: pwError } = await admin.auth.admin.updateUserById(id, { password })
  if (pwError) { console.error('set password failed', pwError.message); await undo(); return json({ ok: false, reason: 'server' }, 500) }

  // 3. Claim the username (its unique index settles any last-instant race).
  const { error: profileError } = await admin.from('profiles').update({ handle }).eq('id', id)
  if (profileError) {
    await undo()
    if (profileError.code === '23505') return json({ ok: false, reason: 'taken' }, 409)
    console.error('claim username failed', profileError.message)
    return json({ ok: false, reason: 'server' }, 500)
  }

  // 4. Sign them in.
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.session) { console.error('first sign-in failed', error?.message); await undo(); return json({ ok: false, reason: 'server' }, 500) }

  await clear(admin, SIGNUP_KEY)
  return json({ ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token })
}

// ---------------------------------------------------------------- set-pin
async function setPin(req: Request, body: Record<string, unknown>): Promise<Response> {
  const pepper = needPepper()
  if (!pepper) return json({ ok: false }, 500)
  if (!pinIsValid(body.pin)) return json({ ok: false, message: 'PIN must be ' + PIN_LENGTH + ' digits.' }, 400)

  // Who is asking? Ask Supabase Auth to validate their session token.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { admin, anon } = clients()
  const { data: who, error: whoError } = await admin.auth.getUser(token)
  if (whoError || !who?.user) {
    // Logged-out (anon key) callers stop here. Say why, so a real failure can be diagnosed.
    const detail = describeToken(token)
    console.error('set-pin: could not verify the caller:', whoError?.message ?? 'no user returned', '|', detail)
    return json({ ok: false, reason: 'session', detail }, 401)
  }

  const password = await derivePassword(pepper, who.user.id, body.pin as string)
  const { error } = await admin.auth.admin.updateUserById(who.user.id, {
    password,
    app_metadata: { has_pin: true, must_change_pin: false },   // only the server can write app_metadata
  })
  if (error) { console.error('updateUserById failed', error.message); return json({ ok: false }, 500) }

  const { data: profile } = await admin.from('profiles').select('handle').eq('id', who.user.id).maybeSingle()
  const handle = normaliseHandle(profile?.handle)
  if (handle) await clear(admin, handle)   // changing the PIN also clears any lockout

  // Changing a password ends the caller's existing sessions on Supabase's side, so the
  // token they used a moment ago is now dead. Sign them straight back in with the new
  // password and hand over the fresh session. (If that fails the PIN is still saved;
  // the app then just asks them to sign in.)
  let fresh: { access_token: string; refresh_token: string } | null = null
  if (who.user.email) {
    const { data, error: signInError } = await anon.auth.signInWithPassword({ email: who.user.email, password })
    if (signInError) console.error('set-pin: saved, but the fresh sign-in failed:', signInError.message)
    else fresh = data.session
  }
  return json({ ok: true, access_token: fresh?.access_token ?? null, refresh_token: fresh?.refresh_token ?? null })
}

// ------------------------------------------------------- delete-account
// Deletes the Supabase Auth user. Every table that hangs off it does so with "on delete
// cascade" (profiles, visits, visit_drinks, visit_notes, push_subscriptions) or "on delete
// set null" (cafes.created_by, cafe_revisions.changed_by) already, in the schema itself — so
// this one call is enough; nothing here needs to delete rows table by table.
async function deleteAccount(req: Request): Promise<Response> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { admin } = clients()
  const { data: who, error: whoError } = await admin.auth.getUser(token)
  if (whoError || !who?.user) {
    const detail = describeToken(token)
    console.error('delete-account: could not verify the caller:', whoError?.message ?? 'no user returned', '|', detail)
    return json({ ok: false, reason: 'session', detail }, 401)
  }

  const { error } = await admin.auth.admin.deleteUser(who.user.id)
  if (error) { console.error('deleteUser failed', error.message); return json({ ok: false }, 500) }
  return json({ ok: true })
}

// ------------------------------------------------------- admin-reset-pin
async function adminResetPin(body: Record<string, unknown>): Promise<Response> {
  const pepper = needPepper()
  if (!pepper) return json({ ok: false }, 500)
  const adminKey = Deno.env.get('ADMIN_KEY')
  if (!adminKey) return json({ ok: false, reason: 'disabled' }, 403)

  const { admin } = clients()
  const limited = await throttle(admin, ADMIN_KEY_NAME, ADMIN_MAX_FAILURES)
  if (limited) return limited
  if (!(await sameSecret(String(body.admin_key ?? ''), adminKey))) return json({ ok: false }, 403)
  if (!pinIsValid(body.pin)) return json({ ok: false, reason: 'pin' }, 400)

  // Find the person, by username or (for older accounts) by email.
  let id: string | null = null
  const handle = normaliseHandle(body.username)
  if (handle) {
    id = await findUserIdByHandle(admin, handle)
  } else if (typeof body.email === 'string' && body.email.includes('@')) {
    const want = body.email.trim().toLowerCase()
    for (let page = 1; page <= 20 && !id; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (!data?.users?.length) break
      id = data.users.find((u) => (u.email ?? '').toLowerCase() === want)?.id ?? null
    }
  }
  if (!id) return json({ ok: false, reason: 'not_found' }, 404)

  const password = await derivePassword(pepper, id, body.pin as string)
  // must_change_pin: after signing in with the temporary PIN they are made to choose their own.
  const { error } = await admin.auth.admin.updateUserById(id, { password, app_metadata: { has_pin: true, must_change_pin: true } })
  if (error) { console.error('reset failed', error.message); return json({ ok: false }, 500) }

  const { data: profile } = await admin.from('profiles').select('handle').eq('id', id).maybeSingle()
  const h = normaliseHandle(profile?.handle)
  if (h) await clear(admin, h)
  await clear(admin, ADMIN_KEY_NAME)
  return json({ ok: true, username: profile?.handle ?? null })
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    if (body?.action === 'sign-in') return await signIn(body)
    if (body?.action === 'sign-up') return await signUp(body)
    if (body?.action === 'set-pin') return await setPin(req, body)
    if (body?.action === 'delete-account') return await deleteAccount(req)
    if (body?.action === 'admin-reset-pin') return await adminResetPin(body)
    return json({ ok: false }, 400)
  } catch (e) {
    console.error(e)
    return json({ ok: false }, 500)
  }
}

if (typeof Deno !== 'undefined') Deno.serve(handle)
