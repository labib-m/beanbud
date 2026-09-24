import { REACTIONS, nextReaction, type ReactionKind, type Tally } from '../lib/reactions'

/** Love / question / dislike on a log: counts for everyone, your own highlighted. Tap again to undo. */
export function ReactionBar({ tally, onReact }: { tally: Tally | undefined; onReact: (kind: ReactionKind | null) => void }) {
  return (
    <div className="reactions" role="group" aria-label="Reactions">
      {REACTIONS.map((r) => {
        const count = tally?.counts[r.kind] ?? 0
        const mine = tally?.mine === r.kind
        return (
          <button
            key={r.kind} type="button" className={`reaction${mine ? ' mine' : ''}`} aria-pressed={mine} aria-label={`${r.label}${count ? `, ${count}` : ''}`}
            onClick={() => onReact(nextReaction(tally?.mine ?? null, r.kind))}
          >
            <span aria-hidden="true">{r.symbol}</span>
            {count > 0 && <span className="reaction-count">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
