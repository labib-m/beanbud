import { supabase } from '../lib/supabase'
import type { Announcement } from '../lib/types'

/** Every announcement, newest first. Everyone signed in can read these. */
export async function fetchAnnouncements(limit = 30): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data as Announcement[]
}

/** Admin only — RLS blocks anyone else, and returns a plain permission error here. */
export async function postAnnouncement(title: string, body: string): Promise<void> {
  const { error } = await supabase.from('announcements').insert({ title: title.trim(), body: body.trim() || null })
  if (error) {
    if (error.code === '42501') throw new Error("You don't have permission to post an announcement.")
    throw new Error(error.message)
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { data, error } = await supabase.from('announcements').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length !== 1) throw new Error("That announcement couldn't be deleted.")
}
