import { CATEGORIES, CATEGORY_LABEL, hasSelection, isSelected, type Category, type Presets, type Selected } from '../lib/filters'

type Props = {
  scope: 'notebook' | 'everyone'   // notebook = only your own entries; everyone = every person's entries
  q: string
  onQ: (q: string) => void
  city: string
  onCity: (c: string) => void
  cities: string[]
  presets: Presets
  selected: Selected
  onToggle: (cat: Category, label: string) => void
  onClearChips: () => void
}

const COPY = {
  notebook: { placeholder: 'Search your notebook: cafe, drink or note', hint: 'Searching only your own entries' },
  everyone: { placeholder: "Search everyone: cafe, drink, note or person", hint: "Searching every person's entries" },
}

/** The same controls on the Notebook and the Feed (specv2 §7 Filter row). Only the reach of the search differs. Sorting lives in the view tabs above. */
export function FilterBar({ scope, q, onQ, city, onCity, cities, presets, selected, onToggle, onClearChips }: Props) {
  const copy = COPY[scope]
  const chips = CATEGORIES.flatMap((cat) => presets[cat].map((label) => ({ cat, label })))
  return (
    <div className="controls">
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input className="search-input" type="search" placeholder={copy.placeholder} aria-label={copy.placeholder} value={q} onChange={(e) => onQ(e.target.value)} />
        {q && <button type="button" className="search-clear" onClick={() => onQ('')}>Clear</button>}
      </div>
      <p className={`scope-hint ${scope}`}>{copy.hint}</p>
      <div className="filter-row">
        <span className="filter-pill-wrap">
          <select className="filter-pill" aria-label="City" value={city} onChange={(e) => onCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </span>
        {chips.length > 0 && <span className="filter-sep" aria-hidden="true" />}
        {chips.map(({ cat, label }) => (
          <button
            key={cat + label} type="button" className="chip" title={CATEGORY_LABEL[cat]}
            aria-pressed={isSelected(selected, cat, label)} onClick={() => onToggle(cat, label)}
          >
            {label}
          </button>
        ))}
      </div>
      {hasSelection(selected) && <button type="button" className="link clear-chips" onClick={onClearChips}>Clear quick filters</button>}
    </div>
  )
}
