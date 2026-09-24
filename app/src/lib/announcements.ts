// Read/unread tracking for Brew Wire, given what a device has last seen. Pure, no imports —
// tested in supabase/tests/announcements.test.mjs.

export type AnnouncementLike = { id: string; created_at: string }

/** Newest first. */
export function sortNewest<T extends AnnouncementLike>(announcements: T[]): T[] {
  return [...announcements].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** How many announcements are newer than the one this device last saw (0 once caught up). */
export function unreadCount<T extends AnnouncementLike>(announcements: T[], lastSeenId: string | null): number {
  const sorted = sortNewest(announcements)
  if (!lastSeenId) return sorted.length
  const idx = sorted.findIndex((a) => a.id === lastSeenId)
  return idx === -1 ? sorted.length : idx
}
