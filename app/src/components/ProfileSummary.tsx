import type { Stats } from '../lib/people'

/** The centred block under a profile's title: stats, then average and usual order, then the one-line bio. */
export function ProfileSummary({ stats, usualOrder, tagline }: { stats: Stats; usualOrder: string | null; tagline: string | null }) {
  return (
    <div className="profile-stats">
      <p className="stat-line">
        {stats.cafes} {stats.cafes === 1 ? 'cafe' : 'cafes'} · {stats.visits} {stats.visits === 1 ? 'visit' : 'visits'} · {stats.cities} {stats.cities === 1 ? 'city' : 'cities'}
      </p>
      <p className="avg-line">
        <span className="avg-star" aria-hidden="true">★</span>
        <b>{stats.average ? stats.average.toFixed(1) : '–'}</b> average
        {usualOrder && <> · usually {usualOrder}</>}
      </p>
      {tagline && <p className="profile-intro">{tagline}</p>}
    </div>
  )
}
