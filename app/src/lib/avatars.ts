// Placeholder avatars. Each has a short key that is stored on the profile
// (profiles.avatar). When the avatar library exists, keys can map to it.
export type AvatarDef = { key: string; label: string; glyph: string; tone: 'acc' | 'sage' | 'deep' }

export const AVATARS: AvatarDef[] = [
  { key: 'bean', label: 'Bean', glyph: '🫘', tone: 'deep' },
  { key: 'cup', label: 'Cup', glyph: '☕', tone: 'acc' },
  { key: 'leaf', label: 'Leaf', glyph: '🌿', tone: 'sage' },
  { key: 'croissant', label: 'Croissant', glyph: '🥐', tone: 'acc' },
  { key: 'moon', label: 'Moon', glyph: '🌙', tone: 'deep' },
  { key: 'sun', label: 'Sun', glyph: '☀️', tone: 'acc' },
  { key: 'wave', label: 'Wave', glyph: '🌊', tone: 'sage' },
  { key: 'star', label: 'Star', glyph: '⭐', tone: 'deep' },
]

export const avatarByKey = (key: string | null | undefined) => AVATARS.find((a) => a.key === key)
