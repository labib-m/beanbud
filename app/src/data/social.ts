import { supabase } from '../lib/supabase'
import type { RecentVisit } from '../lib/recent'
import type { FeedVisit, LiteVisit, Profile } from '../lib/types'

/** Everyone's latest visits. 1000 is plenty for search and filters to work across the whole group. */
export async function fetchFeed(limit = 1000): Promise<FeedVisit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('id, user_id, cafe_id, visited_on, created_at, overall, currency, good_for, amenities, public_note, cafes(id, name, city, area), visit_drinks(drink_type, price, sort_order), profiles(display_name, handle, avatar)')
    .order('visited_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  const rows = data as unknown as FeedVisit[]
  for (const v of rows) v.visit_drinks.sort((a, b) => a.sort_order - b.sort_order)
  return rows
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('id, display_name, handle, home_city, tagline, usual_order, about, avatar')
  if (error) throw new Error(error.message)
  return data as Profile[]
}

/** Every visit by everyone, reduced to what stats and overlaps need. */
export async function fetchLiteVisits(): Promise<LiteVisit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('user_id, cafe_id, overall, visited_on, cafes(name, city)')
    .limit(5000)
  if (error) throw new Error(error.message)
  return data as unknown as LiteVisit[]
}

export type ProfileEdit = Omit<Profile, 'id'>

/** Update your own profile. A blocked update changes 0 rows, so count them. */
export async function updateProfile(id: string, edit: ProfileEdit): Promise<void> {
  const { data, error } = await supabase.from('profiles').update(edit).eq('id', id).select('id')
  if (error) {
    if (error.code === '23505') throw new Error('That username is taken.')
    if (error.code === '23514') throw new Error('Usernames are 2 to 24 characters: letters, numbers, dot, dash or underscore.')
    throw new Error(error.message)
  }
  if (!data || data.length !== 1) throw new Error("Your profile couldn't be saved. Try signing out and in again.")
}

/** Your own profile row (null only if the sign-up trigger somehow never ran). */
export async function fetchMyProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, handle, home_city, tagline, usual_order, about, avatar')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Profile | null
}

/** Is this username unused (ignoring case)? Your own current one counts as free. */
export async function isHandleFree(handle: string, myId: string): Promise<boolean> {
  // ilike treats _ and % as wildcards; usernames may contain _, so escape.
  const pattern = handle.replace(/[\\%_]/g, (c) => '\\' + c)
  const { data, error } = await supabase.from('profiles').select('id').ilike('handle', pattern).neq('id', myId).limit(1)
  if (error) throw new Error(error.message)
  return data.length === 0
}

export const HANDLE_RULE = /^[A-Za-z0-9_.-]{2,24}$/

/**
 * One person's most recent visits with their cafe and drinks (no notes), for the
 * "recent" sections on a profile. Works for anyone: visits and drinks are readable by
 * every signed-in user. 60 is plenty to find 3 different cafes.
 */
export async function fetchRecentActivity(userId: string): Promise<RecentVisit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select('id, cafe_id, visited_on, created_at, overall, currency, cafes(name, city, area), visit_drinks(drink_type, score, price, sort_order)')
    .eq('user_id', userId)
    .order('visited_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) throw new Error(error.message)
  return data as unknown as RecentVisit[]
}
