// Turns a cafe's history entries into plain sentences, e.g. "changed the address from “A” to “B”".
// Pure, no imports (tested in supabase/tests/history.test.mjs). The actor (who) is added by the screen.

export type Revision = {
  id: string
  kind: 'created' | 'edited' | 'listed'
  address: string | null
  map_url: string | null
  prev_address: string | null
  prev_map_url: string | null
  changed_at: string
  changed_by: string | null
  profiles?: { display_name: string | null; handle: string | null } | null
}

const q = (s: string) => '“' + s + '”'

/** What happened, without saying who. Never prints full map links (they are long and noisy). */
export function describeRevision(r: Revision): string {
  if (r.kind === 'created') return 'added the cafe'
  if (r.kind === 'listed') return 'added the cafe to the directory'

  const parts: string[] = []
  if ((r.address ?? '') !== (r.prev_address ?? '')) {
    if (!r.prev_address && r.address) parts.push('added the address ' + q(r.address))
    else if (r.prev_address && !r.address) parts.push('removed the address (it was ' + q(r.prev_address) + ')')
    else parts.push('changed the address from ' + q(r.prev_address ?? '') + ' to ' + q(r.address ?? ''))
  }
  if ((r.map_url ?? '') !== (r.prev_map_url ?? '')) {
    if (!r.prev_map_url && r.map_url) parts.push('added a map link')
    else if (r.prev_map_url && !r.map_url) parts.push('removed the map link')
    else parts.push('changed the map link')
  }
  return parts.length ? parts.join(' and ') : 'edited the cafe'
}
