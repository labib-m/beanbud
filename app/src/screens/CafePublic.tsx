import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CafePageView } from '../components/CafePageView'
import { EditCafeSheet } from '../components/EditCafeSheet'
import { fetchCafePage } from '../data/cafes'
import { useLoad } from '../data/useLoad'
import { useVisits } from '../data/VisitsProvider'

/** /cafes/:cafeId, the shared page of one cafe. */
export function CafePublic() {
  const { cafeId = '' } = useParams()
  const { visits: mine } = useVisits()
  const [tick, setTick] = useState(0)
  const [editing, setEditing] = useState(false)
  const { data, error, loading } = useLoad(() => fetchCafePage(cafeId), [cafeId, tick])

  const myVisitCount = useMemo(() => (mine ?? []).filter((v) => v.cafe_id === cafeId).length, [mine, cafeId])

  if (error) return <main className="screen"><Link className="back" to="/feed?tab=directory">‹ Directory</Link><p className="error" role="alert">{error}</p></main>
  if (loading && !data) return <main className="screen"><p className="muted">Loading…</p></main>
  if (!data) return <main className="screen"><Link className="back" to="/feed?tab=directory">‹ Directory</Link><p className="muted">That cafe isn't here.</p></main>

  return (
    <>
      <CafePageView
        cafe={data.cafe} visits={data.visits} revisions={data.revisions} rating={data.rating}
        myVisitCount={myVisitCount} onEdit={() => setEditing(true)}
      />
      {editing && <EditCafeSheet cafe={data.cafe} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setTick((t) => t + 1) }} />}
    </>
  )
}
