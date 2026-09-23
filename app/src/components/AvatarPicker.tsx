type Props = { value: string | null; onChange: (emoji: string | null) => void }

/**
 * One emoji as an avatar, typed with the device's own emoji keyboard — no custom picker grid
 * (specv2 §1.3: avatar colour now comes from the person, via lib/people.ts toneOf(), not from
 * which glyph they pick, so there's nothing left for a picker UI to control besides the glyph).
 * The emoji shows in the field itself as it's typed; that is the preview.
 */
export function AvatarPicker({ value, onChange }: Props) {
  return (
    <input
      className="input sm avatar-emoji-input"
      value={value ?? ''}
      maxLength={16}
      placeholder="🫘"
      aria-label="Type an emoji to use as your avatar"
      onChange={(e) => onChange(e.target.value.trim() || null)}
    />
  )
}
