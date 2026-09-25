// Reactions on logs: there is one, love. Tallying them, and what a tap does. Pure, no imports
// (tested in supabase/tests/reactions.test.mjs).

export type ReactionKind = 'love'

export const REACTIONS: { kind: ReactionKind; symbol: string; label: string }[] = [
  { kind: 'love', symbol: '❤️', label: 'Love' },
]

export type ReactionRow = { visit_id: string; user_id: string; kind: ReactionKind }
export type Tally = { counts: Record<ReactionKind, number>; mine: ReactionKind | null }

const empty = (): Tally => ({ counts: { love: 0 }, mine: null })

/** Per visit: how many of each reaction, and which one is yours. */
export function tally(rows: ReactionRow[], me: string): Map<string, Tally> {
  const out = new Map<string, Tally>()
  for (const r of rows) {
    const t = out.get(r.visit_id) ?? empty()
    t.counts[r.kind]++
    if (r.user_id === me) t.mine = r.kind
    out.set(r.visit_id, t)
  }
  return out
}

/** Tapping the reaction you already have removes it; tapping another switches to it. */
export const nextReaction = (current: ReactionKind | null, tapped: ReactionKind): ReactionKind | null => (current === tapped ? null : tapped)

/** The tally after you change your reaction to `next` (null = none), without refetching. */
export function withMyReaction(t: Tally | undefined, next: ReactionKind | null): Tally {
  const base = t ?? empty()
  const counts = { ...base.counts }
  if (base.mine) counts[base.mine]--
  if (next) counts[next]++
  return { counts, mine: next }
}
