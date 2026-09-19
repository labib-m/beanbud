import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const PIN_LENGTH = 4 // keep in step with PIN_LENGTH in supabase/functions/pin-auth/index.ts

type Result = { ok: true } | { ok: false; message: string }
type ErrorBody = { locked?: boolean; minutes?: number; reason?: string } | null

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

/** Save (or change) the PIN for the signed-in person. */
export async function savePin(pin: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('pin-auth', { body: { action: 'set-pin', pin } })
  if (error || !data?.ok) return { ok: false, message: "Couldn't save your PIN. Try again in a moment." }
  await supabase.auth.refreshSession() // pulls in the updated "has a PIN" markers
  return { ok: true }
}
