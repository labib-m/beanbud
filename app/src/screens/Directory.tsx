import { useMemo, useState } from 'react'
import { DirectoryView } from '../components/DirectoryView'
import { fetchDirectory } from '../data/cafes'
import { useLoad } from '../data/useLoad'
import { groupAlphabetically } from '../lib/directory'

export function Directory() {
  const { data, error, loading } = useLoad(fetchDirectory, [])
  const [query, setQuery] = useState('')
  const groups = useMemo(() => groupAlphabetically(data ?? [], query), [data, query])

  if (error) return <p className="error" role="alert">{error}</p>
  if (loading && !data) return <p className="muted">Loading…</p>
  return <DirectoryView groups={groups} total={data?.length ?? 0} query={query} onQuery={setQuery} />
}
