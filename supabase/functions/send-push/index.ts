// Bean Bud — send-push: notify everyone (except the author) when a visit is logged or edited.
//
// This function does not run on a schedule and nothing in the app calls it directly. A
// Database Webhook (Database → Webhooks in the Supabase dashboard) calls it automatically
// after every INSERT or UPDATE on the "visits" table, with the new row in the request body.
//
// Deploy with "Verify JWT" switched OFF, same reason as pin-auth: the webhook is not a signed-in
// user, it is Supabase's own server calling in. Instead this function checks a shared secret
// header itself (PUSH_WEBHOOK_SECRET), which only the webhook and this function know.
//
// Secrets you set (SUPABASE_URL / SERVICE_ROLE_KEY are automatic):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   the key pair that proves a push came from us.
//                                         Generate once; if lost, everyone must turn
//                                         notifications on again.
//   VAPID_SUBJECT                        "mailto:you@example.com" — required by the push
//                                         standard, shown to push services, not to users.
//   PUSH_WEBHOOK_SECRET                  long random string. Set the same value as a custom
//                                         header ("x-webhook-secret") on the Database Webhook.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

function admin() {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, { auth: { persistSession: false } })
}

type Profile = { display_name: string | null; handle: string | null } | null

/** Mirrors app/src/lib/people.ts displayName(). Keep the two in step. */
export function authorName(profile: Profile): string {
  const name = profile?.display_name?.trim()
  if (name) return name
  if (profile?.handle) return '@' + profile.handle
  return 'Someone'
}

export type NotifyKind = 'INSERT' | 'UPDATE'

// The bold header on the notification. iOS always adds its own "from Bean Bud" line right below
// this no matter what it says (that one really is fixed — it's Apple's disclosure that this is a
// web app, not a native one). A blank title falls back to showing "Bean Bud" there instead, which
// just repeats that fixed line, so a short title of our own reads better than leaving it empty.
const HEADER = 'Brewhi!'

/** The notification everyone but the author gets. */
export function notificationFor(kind: NotifyKind, cafe: { id: string; name: string }, who: string) {
  const verb = kind === 'INSERT' ? 'just logged' : 'just updated their visit to'
  return { title: HEADER, body: `${who} ${verb} ${cafe.name}`, url: `/cafes/${cafe.id}` }
}

type WebhookBody = {
  type?: string
  table?: string
  record?: { id?: string; user_id?: string; cafe_id?: string }
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? ''
  if (!webhookSecret || req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('unauthorized', { status: 401 })
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? ''
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error('send-push: VAPID keys are not configured, nothing sent')
    return new Response(JSON.stringify({ ok: false, reason: 'not_configured' }), { status: 200 })
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  let body: WebhookBody
  try {
    body = await req.json()
  } catch {
    return new Response('bad json', { status: 400 })
  }

  if (body.table !== 'visits' || (body.type !== 'INSERT' && body.type !== 'UPDATE')) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }
  const record = body.record
  if (!record?.id || !record.user_id || !record.cafe_id) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  const db = admin()
  const [{ data: cafe }, { data: author }, { data: subs, error: subsError }] = await Promise.all([
    db.from('cafes').select('id, name').eq('id', record.cafe_id).maybeSingle(),
    db.from('profiles').select('display_name, handle').eq('id', record.user_id).maybeSingle(),
    db.from('push_subscriptions').select('id, endpoint, p256dh_key, auth_key').neq('user_id', record.user_id),
  ])

  if (subsError) { console.error('send-push: could not read subscriptions', subsError.message); return new Response(JSON.stringify({ ok: false }), { status: 200 }) }
  if (!cafe || !subs || subs.length === 0) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })

  const message = JSON.stringify(notificationFor(body.type as NotifyKind, cafe, authorName(author ?? null)))

  let sent = 0
  const gone: string[] = []
  await Promise.all(
    (subs as { id: string; endpoint: string; p256dh_key: string; auth_key: string }[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } }, message)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) gone.push(s.id)   // the subscription is dead; stop trying it
        else console.error('send-push: delivery failed', status, (err as Error)?.message)
      }
    }),
  )

  if (gone.length > 0) await db.from('push_subscriptions').delete().in('id', gone)

  return new Response(JSON.stringify({ ok: true, sent, removed: gone.length }), { status: 200 })
}

if (typeof Deno !== 'undefined') Deno.serve(handle)
