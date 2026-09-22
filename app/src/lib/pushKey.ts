// No imports on purpose: this one pure function is unit tested directly with Node
// (supabase/tests/push.test.mjs), unlike the rest of push.ts which touches the browser
// and the network.

/** A VAPID public key, as the push standard wants it: raw bytes, not base64 text. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}
