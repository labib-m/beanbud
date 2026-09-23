// Star geometry from designv2/specv2.md §6.2. Five separate buttons; tapping the current
// value clears it. Whole stars only on input. Hit area defaults to size + 12 (34x44 for the
// 22px criteria-row default), which the drink-rating usage overrides to 22x44 for its 16px stars.
const STAR = 'M12 2.3l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.36l-5.9 3.1 1.13-6.57L2.45 9.24l6.6-.96z'

type Props = {
  value: number | null
  onChange: (v: number | null) => void
  label: string
  size?: number
  hitWidth?: number
  color?: string
}

export function StarInput({ value, onChange, label, size = 22, hitWidth, color = 'var(--acc)' }: Props) {
  const w = hitWidth ?? size + 12
  return (
    <div className="stars" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="star"
          style={{ width: w, height: 44 }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={value === n}
          onClick={() => onChange(value === n ? null : n)}
        >
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <path d={STAR} fill={value !== null && n <= value ? color : 'var(--line2)'} />
          </svg>
        </button>
      ))}
    </div>
  )
}
