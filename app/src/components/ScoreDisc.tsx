import { tone } from '../lib/stats'

export function ScoreDisc({ score, size = 54 }: { score: number; size?: number }) {
  const t = score > 0 ? tone(score) : 'plain'
  return (
    <span className={`disc ${t}`} style={{ width: size, height: size, fontSize: size > 56 ? 21 : 19 }}>
      {score > 0 ? score.toFixed(1) : '–'}
    </span>
  )
}
