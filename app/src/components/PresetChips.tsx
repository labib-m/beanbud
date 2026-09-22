import { CATEGORIES, CATEGORY_LABEL, hasSelection, isSelected, type Category, type Presets, type Selected } from '../lib/filters'

type Props = {
  presets: Presets
  selected: Selected
  onToggle: (cat: Category, label: string) => void
  onClear: () => void
}

/**
 * Quick filters: your most-used "good for" tags, drinks and amenities, in one row of chips with no
 * headings. (They still combine by group: chips of one kind widen the match, chips of different
 * kinds narrow it. The kind is only in the tooltip.)
 */
export function PresetChips({ presets, selected, onToggle, onClear }: Props) {
  const chips = CATEGORIES.flatMap((cat) => presets[cat].map((label) => ({ cat, label })))
  if (!chips.length) return null
  return (
    <div className="presets" role="group" aria-label="Quick filters">
      <div className="chips">
        {chips.map(({ cat, label }) => (
          <button
            key={cat + label} type="button" className="chip" title={CATEGORY_LABEL[cat]}
            aria-pressed={isSelected(selected, cat, label)} onClick={() => onToggle(cat, label)}
          >
            {label}
          </button>
        ))}
      </div>
      {hasSelection(selected) && <button type="button" className="link mut clear-chips" onClick={onClear}>Clear quick filters</button>}
    </div>
  )
}
