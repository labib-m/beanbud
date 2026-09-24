import { supabase } from '../lib/supabase'
import type { SupportMessage } from '../lib/types'

/** Send the developer a message, as yourself. */
export async function sendSupportMessage(body: string): Promise<void> {
  const { error } = await supabase.from('support_messages').insert({ body: body.trim() })
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') throw new Error("Messages aren't set up yet. Try again later.")
    throw new Error(error.message)
  }
}

/** Admin only — RLS returns nothing for anyone else. Newest first. */
export async function fetchSupportMessages(limit = 100): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, user_id, body, created_at, profiles(display_name, handle, avatar)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data as unknown as SupportMessage[]
}

export async function deleteSupportMessage(id: string): Promise<void> {
  const { data, error } = await supabase.from('support_messages').delete().eq('id', id).select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length !== 1) throw new Error("That message couldn't be deleted.")
}
