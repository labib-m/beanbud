import { supabase } from '../lib/supabase'
import type { Cafe, FullVisit, VisitInput } from '../lib/types'

/** Save a visit (cafe + visit + drinks + private note) in one database call. */
export async function saveVisit(input: VisitInput, visitId?: string): Promise<string> {
  const { data, error } = await supabase.rpc('save_visit', {
    p_cafe: input.cafe,
    p_visit: input.visit,
    p_drinks: input.drinks,
    p_notes: input.notes,
    p_visit_id: visitId ?? null,
  })
  if (error) throw new Error(friendlyError(error))
  return data as string
}

/** Turn a database error into something a person can act on. */
function friendlyError(e: { code?: string; message: string }): string {
  if (e.code === '42501') return "That visit isn't yours to change."
  if (e.code === '23514') return 'One of the values is out of range. Check the ratings and prices.'
  if (e.code === '23505') return 'That cafe already exists with different capitalisation.'
  if (e.code === 'PGRST202') return 'The save_visit function is missing. Run the second migration in Supabase.'
  return e.message
}

/** Every cafe anyone has added, for the name autocomplete. */
export async function listCafes(): Promise<Cafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, name, city, area, address, map_url')
    .order('name')
    .limit(1000)
  if (error) throw new Error(error.message)
  return data as Cafe[]
}

/** Drink names this user has logged, most used first (for the drink chips). */
export async function myDrinkTypes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('visit_drinks')
    .select('drink_type, visits!inner(user_id)')
    .eq('visits.user_id', userId)
    .limit(1000)
  if (error) throw new Error(error.message)
  const counts = new Map<string, number>()
  for (const row of data as { drink_type: string }[]) {
    counts.set(row.drink_type, (counts.get(row.drink_type) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map((e) => e[0])
}

const FULL_SELECT =
  '*, cafes(id, name, city, area, address, map_url), visit_drinks(id, drink_type, price, score, sort_order), visit_notes(notes)'

/** All of this user's visits with cafe, drinks and their own private note. */
export async function myVisits(userId: string): Promise<FullVisit[]> {
  const { data, error } = await supabase
    .from('visits')
    .select(FULL_SELECT)
    .eq('user_id', userId)
    .order('visited_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  for (const v of data as unknown as FullVisit[]) v.visit_drinks.sort((a, b) => a.sort_order - b.sort_order)
  return data as unknown as FullVisit[]
}

/**
 * Delete a visit. The database silently removes 0 rows if the policies block
 * it, so count what was really removed and fail loudly if it wasn't one.
 */
export async function deleteVisit(id: string): Promise<void> {
  const { data, error } = await supabase.from('visits').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length !== 1) throw new Error("That visit couldn't be deleted. It may not be yours.")
}
