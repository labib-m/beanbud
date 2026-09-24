import { supabase } from '../lib/supabase'
import { VISIT_DETAIL_COLUMNS } from '../lib/types'
import { cafeRating, type CafeRating, type CafeVisit } from '../lib/cafeInfo'
import type { DirectoryCafe } from '../lib/directory'
import type { Revision } from '../lib/history'

export type CafeRecord = {
  id: string
  name: string
  city: string
  area: string
  address: string | null
  map_url: string | null
  code: string
}

export type CafePage = { cafe: CafeRecord; visits: CafeVisit[]; revisions: Revision[]; rating: CafeRating }

/** Every cafe in the shared directory. */
export async function fetchDirectory(): Promise<DirectoryCafe[]> {
  const { data, error } = await supabase
    .from('cafes')
    .select('id, name, city, area')
    .order('name')
    .limit(5000)
  if (error) throw new Error(error.message)
  return data as DirectoryCafe[]
}

/** Everything a cafe's public page shows. Null if there is no such cafe. */
export async function fetchCafePage(cafeId: string): Promise<CafePage | null> {
  const [cafe, visits, revisions, overalls] = await Promise.all([
    supabase.from('cafes').select('id, name, city, area, address, map_url, code').eq('id', cafeId).maybeSingle(),
    supabase
      .from('visits')
      .select(`${VISIT_DETAIL_COLUMNS}, profiles(display_name, handle, avatar)`)
      .eq('cafe_id', cafeId)
      .order('visited_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('cafe_revisions')
      .select('id, kind, address, map_url, prev_address, prev_map_url, changed_at, changed_by, profiles(display_name, handle)')
      .eq('cafe_id', cafeId)
      .order('changed_at', { ascending: false }),
    // Every rated visit's overall score, from everyone (not just the recent ones listed on the page).
    supabase.from('visits').select('overall').eq('cafe_id', cafeId).not('overall', 'is', null).limit(5000),
  ])
  if (cafe.error) throw new Error(cafe.error.message)
  if (visits.error) throw new Error(visits.error.message)
  if (revisions.error) throw new Error(revisions.error.message)
  if (overalls.error) throw new Error(overalls.error.message)
  if (!cafe.data) return null
  return {
    cafe: cafe.data as CafeRecord,
    visits: visits.data as unknown as CafeVisit[],
    revisions: revisions.data as unknown as Revision[],
    rating: cafeRating((overalls.data as { overall: number | string | null }[]).map((v) => v.overall)),
  }
}

function friendly(e: { code?: string; message: string }): string {
  if (e.code === 'P0002') return 'That cafe was not found.'
  if (e.code === '22023') return 'A cafe needs both an address and a map link.'
  if (e.code === '23514') return 'The map link must start with http:// or https://, and the address must be under 300 characters.'
  return e.message
}

/** Change a cafe's address and map link (both required). Recorded in its history under your name. */
export async function editCafe(cafeId: string, address: string, mapUrl: string): Promise<void> {
  const { error } = await supabase.rpc('edit_cafe', { p_cafe_id: cafeId, p_address: address, p_map_url: mapUrl })
  if (error) throw new Error(friendly(error))
}
