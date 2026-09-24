type Props<T extends string> = {
  label: string
  tabs: { key: T; label: string; badge?: number }[]
  value: T
  onChange: (key: T) => void
}

/** The underlined view switcher under the title, shared by Notebook and Feed. */
export function ViewTabs<T extends string>({ label, tabs, value, onChange }: Props<T>) {
  return (
    <div className="sort-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className={`sort-tab${value === t.key ? ' active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.badge != null && t.badge > 0 && <span className="tab-count">{t.badge > 9 ? '9+' : t.badge}</span>}
        </button>
      ))}
    </div>
  )
}
