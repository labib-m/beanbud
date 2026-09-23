import { initial, toneOf } from '../lib/people'

type P = { display_name: string | null; handle: string | null; avatar?: string | null } | null

/** Circle filled with the person's tone (specv2 §1.3); their chosen emoji, or their initial if they haven't set one. */
export function Avatar({ id, profile, size = 32 }: { id: string; profile: P; size?: number }) {
  const emoji = profile?.avatar?.trim()
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: toneOf(id), fontSize: Math.round(size * (emoji ? 0.5 : 0.4)) }}
      aria-hidden="true"
    >
      {emoji || initial(profile)}
    </span>
  )
}
