// Read/unread tracking for the Brew Wire tab, given what device has last seen. Pure, no
// imports — tested in supabase/tests/announcements.test.mjs.

export type AnnouncementLike = { id: string; created_at: string }

/** Newest first. */
export function sortNewest<T extends AnnouncementLike>(announcements: T[]): T[] {
  return [...announcements].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** True when the newest announcement isn't the one this device last saw. */
export function isUnread<T extends AnnouncementLike>(announcements: T[], lastSeenId: string | null): boolean {
  const newest = sortNewest(announcements)[0]
  return newest != null && newest.id !== lastSeenId
}
