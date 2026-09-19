// Bean Bud — sign in with a username.
//
// The browser sends { username }. This function looks up which account owns
// that username, then asks Supabase Auth to email a sign-in link to the
// address on file. It NEVER returns the email address, and it gives the same
// answer whether or not the username exists, so it can't be used to discover
// who has an account or what their email is.
//
// It runs with the project's service_role key, which Supabase provides to
// Edge Functions automatically. That key never reaches the browser.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Where a sign-in link may send people back to. Add your Vercel address as an
// Edge Function secret: ALLOWED_ORIGINS=https://your-app.vercel.app
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
]

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Always the same reply, so the response reveals nothing about the account.
const same = () =>
  new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })

// ilike treats _ and % as wildcards; usernames may contain _, so escape them.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body = await req.json()
    const handle = String(body?.username ?? '').trim().replace(/^@/, '')
    if (!/^[A-Za-z0-9_.-]{2,24}$/.test(handle)) return same()

    const redirectTo = ALLOWED_ORIGINS.includes(String(body?.redirectTo ?? '')) ? String(body.redirectTo) : undefined

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const { data: profile } = await admin.from('profiles').select('id').ilike('handle', escapeLike(handle)).maybeSingle()
    if (!profile) return same()

    const { data: found } = await admin.auth.admin.getUserById(profile.id)
    const email = found?.user?.email
    if (!email) return same()

    // Send the link with the ordinary (anon) client; shouldCreateUser:false so
    // this path can only ever sign in an existing account.
    const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
    const { error } = await anon.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    if (error) console.error('signInWithOtp failed:', error.message)
    return same()
  } catch (e) {
    console.error(e)
    return same()
  }
})
