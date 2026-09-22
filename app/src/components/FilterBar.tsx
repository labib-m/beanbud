import { SORT_OPTIONS, type Category, type Presets, type Selected, type Sort } from '../lib/filters'
import { PresetChips } from './PresetChips'

type Props = {
  scope: 'notebook' | 'everyone'   // notebook = only your own entries; everyone = every person's entries
  q: string
  onQ: (q: string) => void
  city: string
  onCity: (c: string) => void
  cities: string[]
  sort: Sort
  onSort: (s: Sort) => void
  presets: Presets
  selected: Selected
  onToggle: (cat: Category, label: string) => void
  onClearChips: () => void
}

const COPY = {
  notebook: { placeholder: 'Search your notebook: cafe, area or drink', hint: 'Searching only your own entries' },
  everyone: { placeholder: "Search everyone: cafe, drink, note or person", hint: "Searching every person's entries" },
}

/** The same four controls on the Notebook and the Feed. Only the reach of the search differs. */
export function FilterBar({ scope, q, onQ, city, onCity, cities, sort, onSort, presets, selected, onToggle, onClearChips }: Props) {
  const copy = COPY[scope]
  return (
    <div className="controls">
      <input className="input sm" type="search" placeholder={copy.placeholder} aria-label={copy.placeholder} value={q} onChange={(e) => onQ(e.target.value)} />
      <p className={`scope-hint ${scope}`}>{copy.hint}</p>
      <div className="row2">
        <select className="input sm" aria-label="City" value={city} onChange={(e) => onCity(e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input sm" aria-label="Sort" value={sort} onChange={(e) => onSort(e.target.value as Sort)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <PresetChips presets={presets} selected={selected} onToggle={onToggle} onClear={onClearChips} />
    </div>
  )
}
