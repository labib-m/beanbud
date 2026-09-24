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
  const { error } = await supabase.from('reactions').upsert({ visit_id: visitId, kind }, { onConflict: 'visit_id,user_id' })
  if (error) throw friendly(error)
}
