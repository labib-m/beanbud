import { avatarByKey } from '../lib/avatars'
import { initial, toneOf } from '../lib/people'

type P = { display_name: string | null; handle: string | null; avatar?: string | null } | null

export function Avatar({ id, profile, size = 32 }: { id: string; profile: P; size?: number }) {
  const chosen = avatarByKey(profile?.avatar)
  return (
    <span
      className={`avatar ${chosen ? chosen.tone : toneOf(id)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * (chosen ? 0.5 : 0.4)) }}
      aria-hidden="true"
    >
      {chosen ? chosen.glyph : initial(profile)}
    </span>
  )
}
