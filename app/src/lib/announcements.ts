// Which announcement (if any) the banner should show, given what's already been dismissed on
// this device. Pure, no imports — tested in supabase/tests/announcements.test.mjs.

export type AnnouncementLike = { id: string; created_at: string }

/** The newest announcement not yet dismissed here, or null if there is none, or all are seen. */
export function nextToShow<T extends AnnouncementLike>(announcements: T[], dismissedIds: string[]): T | null {
  const dismissed = new Set(dismissedIds)
  const undismissed = announcements.filter((a) => !dismissed.has(a.id))
  if (!undismissed.length) return null
  return [...undismissed].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}
