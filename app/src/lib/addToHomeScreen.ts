// Whether to show the "add to your Home Screen" tutorial after someone creates an account.
// No imports on purpose: this file is pure logic, unit tested directly with Node
// (supabase/tests/add_to_home_screen.test.mjs). The component that actually reads
// localStorage/navigator and renders the dialog is components/AddToHomeScreenGuide.tsx.

// localStorage keys. Centralised here so the two places that touch them (SignIn.tsx sets
// NEW_SIGNUP_KEY right after a sign-up; the guide reads it and sets SEEN_KEY) can't drift apart.
export const NEW_SIGNUP_KEY = 'bb-new-signup'
export const SEEN_KEY = 'bb-a2hs-seen'

/** iPhone or iPad. iPadOS 13+ reports itself as a Mac, so a touchscreen "Mac" counts too. */
export function isIOSDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

export type GuideCheck = {
  justSignedUp: boolean   // set right after this browser created an account
  seen: boolean           // this browser already dismissed the guide once
  isIOS: boolean
  isStandalone: boolean   // already opened from a Home Screen icon: nothing to teach
}

/** The guide is for a brand-new account, on an iPhone/iPad browser tab, seeing it for the first time. */
export function shouldShowGuide({ justSignedUp, seen, isIOS, isStandalone }: GuideCheck): boolean {
  return justSignedUp && !seen && isIOS && !isStandalone
}
