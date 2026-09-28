import { useState } from 'react'

type Props = {
  id: string
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
}

/** A plain text field with a dropdown of matching existing values (city, neighbourhood): the same combo/suggest look as the cafe name field. */
export function ComboField({ id, value, onChange, suggestions, placeholder }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="combo">
      <input
        id={id} className="input sm" value={value} autoComplete="off" placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setShow(true) }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
      />
      {show && suggestions.length > 0 && (
        <ul className="suggest" role="listbox">
          {suggestions.map((s) => (
            <li key={s} role="option" aria-selected="false" onMouseDown={(e) => { e.preventDefault(); onChange(s); setShow(false) }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
