import { AVATARS } from '../lib/avatars'

export function AvatarPicker({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((a) => (
        <button
          key={a.key} type="button" role="radio" aria-checked={value === a.key} aria-label={a.label}
          className={`avatar-opt ${a.tone}`} onClick={() => onChange(a.key)}
        >
          {a.glyph}
        </button>
      ))}
    </div>
  )
}
