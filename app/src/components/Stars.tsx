// Read-only star row, drawn as one masked element so fractional averages
// render exactly (design/spec.md §6).
export const STAR_PATH = 'M12 2.3l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.36l-5.9 3.1 1.13-6.57L2.45 9.24l6.6-.96z'

const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${STAR_PATH}'/></svg>`,
)}")`

export function Stars({ value, size = 14, fill = 'var(--accText)', empty = 'var(--line2)' }: { value: number; size?: number; fill?: string; empty?: string }) {
  const p = Math.max(0, Math.min(1, value / 5)) * 100
  const mask = `${MASK} 0 0 / ${size}px ${size}px repeat-x`
  return (
    <span
      role="img"
      aria-label={value ? `${value.toFixed(1)} out of 5` : 'not rated'}
      style={{
        display: 'inline-block', width: size * 5, height: size, flex: 'none',
        WebkitMask: mask, mask,
        background: `linear-gradient(90deg, ${fill} ${p}%, ${empty} ${p}%)`,
      }}
    />
  )
}
