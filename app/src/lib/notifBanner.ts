// Whether to show the floating "turn on notifications" banner for a new user. No imports on
// purpose: pure logic, unit tested directly with Node (supabase/tests/notif_banner.test.mjs).
// The component that reads localStorage and lib/push.ts's live status lives in
// components/NotificationsBanner.tsx.

// Set by SignIn.tsx right after a successful sign-up. Cleared once notifications are
// confirmed on for this device — never for any other reason, so the banner keeps coming
// back (e.g. after adding the Home Screen icon, where push becomes possible for the first
// time) until it's actually turned on.
export const NEW_USER_NOTIF_KEY = 'bb-new-user-notif'

export type PushStatusLike = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on'

/** Shows only for a new account, while push is possible here but not yet turned on. */
export function shouldShowNotifBanner(newUser: boolean, status: PushStatusLike): boolean {
  return newUser && (status === 'off' || status === 'blocked')
}
