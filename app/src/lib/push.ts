import { supabase } from './supabase'
import { urlBase64ToUint8Array } from './pushKey'

export type PushStatus = 'unsupported' | 'blocked' | 'off' | 'on'

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/** Registers (or reuses) the service worker. Does not ask for permission. */
async function swRegistration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
}

/** off = never asked or the subscription was removed; blocked = the person said no in the OS/browser. */
export async function currentPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/** Asks for permission (must be called from a click), subscribes, and saves the subscription. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!publicKey) throw new Error('Notifications are not set up yet (missing VITE_VAPID_PUBLIC_KEY).')

  const reg = await swRegistration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource }))

  const json = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth_key: json.keys?.auth,
  })
  if (error) throw new Error(error.message)
  return 'on'
}

/** Unsubscribes this device and forgets it server-side. Safe to call even if it was never on. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  const { error } = await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })
  if (error) throw new Error(error.message)
}
