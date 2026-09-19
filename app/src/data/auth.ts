import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const PIN_LENGTH = 4 // keep in step with PIN_LENGTH in supabase/functions/pin-auth/index.ts

type Result = { ok: true } | { ok: false; message: string }

// A message to show on the sign-in screen once, e.g. after a stale session was cleared.
let flashMessage = ''
export const takeFlash = (): string => { const m = flashMessage; flashMessage = ''; return m }
export const setFlash = (message: string): void => { flashMessage = message }
type ErrorBody = { locked?: boolean; minutes?: number; reason?: string; detail?: string } | null

async function bodyOf(error: unknown): Promise<ErrorBody> {
  if (error instanceof FunctionsHttpError) {
    try { return await error.context.json() } catch { return null }
  }
  return null
}

const lockedMessage = (minutes = 15) =>
  `Too many wrong tries. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`

async function startSession(data: { access_token: string; refresh_token: string }): Promise<Result> {
  const { error } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
  return error ? { ok: false, message: 'Signed in, but the session could not be saved. Try again.' } : { ok: true }
}

/** Username + PIN sign-in. The session is created inside this app. */
export async function signInWithPin(username: string, pin: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('pin-auth', { body: { action: 'sign-in', username, pin } })
  if (error) {
    const body = await bodyOf(error)
    if (body?.locked) return { ok: false, message: lockedMessage(body.minutes) }
    if (error instanceof FunctionsHttpError && error.context.status === 401) return { ok: false, message: 'Wrong username or PIN.' }
    return { ok: false, message: "Sign-in isn't available right now. Try again in a moment." }
  }
  return startSession(data)
}

/** Create an account with a username, a PIN and the invite code. */
export async function signUp(username: string, pin: string, invite: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('pin-auth', { body: { action: 'sign-up', username, pin, invite } })
  if (error) {
    const body = await bodyOf(error)
    if (body?.locked) return { ok: false, message: lockedMessage(body.minutes) }
    switch (body?.reason) {
      case 'closed': return { ok: false, message: 'New accounts are closed right now. Contact the developer.' }
      case 'invite': return { ok: false, message: "That invite code isn't right." }
      case 'taken': return { ok: false, message: 'That username is taken. Try another.' }
      case 'username': return { ok: false, message: 'Usernames are 2 to 24 characters: letters, numbers, dot, dash or underscore.' }
      case 'pin': return { ok: false, message: `Your PIN must be ${PIN_LENGTH} digits.` }
      default: return { ok: false, message: "Couldn't create the account. Try again in a moment." }
    }
  }
  return startSession(data)
}

const callSetPin = (pin: string) =>
  supabase.functions.invoke('pin-auth', { body: { action: 'set-pin', pin }, timeout: 20000 })

/** Resolves to 'timeout' if the promise has not settled in `ms`, so nothing can hang the screen forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([promise, new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms))])
}

/** Sign out this browser only, and leave a message for the sign-in screen. */
async function signOutWithMessage(message: string): Promise<void> {
  flashMessage = message
  await withTimeout(supabase.auth.signOut({ scope: 'local' }), 5000)
}

/**
 * Save (or change) the PIN for the signed-in person.
 *
 * Changing a password ends the person's current login session on Supabase's side, so
 * the server signs them straight back in and returns a fresh session, which we adopt.
 * If a session is stale to begin with, try one refresh; failing that, sign out cleanly
 * with a plain message instead of leaving them stuck.
 */
export async function savePin(pin: string): Promise<Result> {
  let { data, error } = await callSetPin(pin)

  if (error instanceof FunctionsHttpError && error.context.status === 401) {
    const refreshed = await withTimeout(supabase.auth.refreshSession(), 8000)
    if (refreshed !== 'timeout' && !refreshed.error) {
      ;({ data, error } = await callSetPin(pin))
    } else {
      await signOutWithMessage('Your sign-in expired. Please sign in again with your username and PIN.')
      return { ok: false, message: flashMessage }
    }
  }

  if (error) {
    const status = error instanceof FunctionsHttpError ? error.context.status : null
    if (status === 401) {
      const body = (await bodyOf(error)) as { detail?: string } | null
      return {
        ok: false,
        message: "We couldn't verify your session" + (body?.detail ? ` (${body.detail})` : '') + '. Go back to sign in, sign in again, and retry.',
      }
    }
    if (!status) return { ok: false, message: 'The server took too long to answer. Check your connection and try again, or go back to sign in.' }
    return { ok: false, message: `Couldn't save your PIN (error ${status}). Try again in a moment, or go back to sign in.` }
  }
  if (!data?.ok) return { ok: false, message: "Couldn't save your PIN. Try again in a moment, or go back to sign in." }

  // Saved. Adopt the fresh session the server just made.
  if (data.access_token && data.refresh_token) {
    const started = await withTimeout(startSession(data), 8000)
    if (started !== 'timeout' && started.ok) return { ok: true }
  }
  // Saved, but no fresh session could be started: just ask them to sign in with the new PIN.
  await signOutWithMessage('Your PIN is saved. Please sign in with it.')
  return { ok: true }
}
