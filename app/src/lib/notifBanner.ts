// Whether to show the floating "turn on notifications" banner. No imports on purpose: pure
// logic, unit tested directly with Node (supabase/tests/notif_banner.test.mjs). The component
// that reads lib/push.ts's live status lives in components/NotificationsBanner.tsx.

export type PushStatusLike = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on'

/** Shows for anyone signed in, on any page, while push is possible here but not turned on. */
export function shouldShowNotifBanner(status: PushStatusLike): boolean {
  return status === 'off' || status === 'blocked'
}
