import { supabase } from '../lib/supabase'
import type { ReactionKind, ReactionRow } from '../lib/reactions'

function friendly(e: { code?: string; message: string }): Error {
  if (e.code === '42P01' || e.code === 'PGRST205') return new Error("Reactions aren't set up yet. Try again later.")
  return new Error(e.message)
}

/** Every reaction on every log. Small enough to fetch in one go, and it keeps counts exact. */
export async function fetchReactions(): Promise<ReactionRow[]> {
  const { data, error } = await supabase.from('reactions').select('visit_id, user_id, kind').limit(20000)
  if (error) throw friendly(error)
  return data as ReactionRow[]
}

/** Set your reaction on a log; null removes it. */
export async function setReaction(visitId: string, kind: ReactionKind | null): Promise<void> {
  if (kind === null) {
    const { error } = await supabase.from('reactions').delete().eq('visit_id', visitId)
    if (error) throw friendly(error)
    return
  }
  // Change your existing reaction if you have one, otherwise add it. (An upsert would also try to
  // rewrite visit_id, which the database rightly doesn't let anyone change.)
  const { data, error } = await supabase.from('reactions').update({ kind }).eq('visit_id', visitId).select('visit_id')
  if (error) throw friendly(error)
  if (data.length > 0) return
  const { error: insertError } = await supabase.from('reactions').insert({ visit_id: visitId, kind })
  if (insertError && insertError.code !== '23505') throw friendly(insertError)
}
