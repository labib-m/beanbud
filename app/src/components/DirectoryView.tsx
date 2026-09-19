import { Link } from 'react-router-dom'
import type { DirectoryGroup } from '../lib/directory'

/** The A-Z list. Display only; Directory loads the data and holds the search text. */
export function DirectoryView({ groups, total, query, onQuery }: { groups: DirectoryGroup[]; total: number; query: string; onQuery: (q: string) => void }) {
  const shown = groups.reduce((n, g) => n + g.cafes.length, 0)
  return (
    <>
      <input className="input sm" type="search" placeholder="Search cafes by name, area or city" aria-label="Search the directory" value={query} onChange={(e) => onQuery(e.target.value)} />
      <p className="muted small dir-count">
        {total === 0 ? 'No cafes yet' : query.trim() ? `${shown} of ${total} ${total === 1 ? 'cafe' : 'cafes'}` : `${total} ${total === 1 ? 'cafe' : 'cafes'}, A to Z`}
      </p>

      {total === 0 && (
        <div className="empty">
          <h2>The directory is empty</h2>
          <p className="muted">Log a visit at a new cafe and it's added here for everyone. The directory grows with every cafe anyone logs.</p>
        </div>
      )}
      {total > 0 && shown === 0 && <p className="muted">No cafes match “{query.trim()}”.</p>}

      {groups.map((g) => (
        <section key={g.letter} className="dir-group" aria-label={`Cafes starting with ${g.letter}`}>
          <h3 className="dir-letter">{g.letter}</h3>
          <ul className="plain">
            {g.cafes.map((c) => (
              <li key={c.id}>
                <Link className="recent-row" to={`/cafes/${c.id}`}>
                  <span className="recent-main"><b>{c.name}</b><span className="muted small">{[c.area, c.city].filter(Boolean).join(', ')}</span></span>
                  <span className="muted" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
