import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { myVisits } from './visits'
import { LogSheet } from '../screens/LogSheet'
import type { Cafe, FullVisit } from '../lib/types'

type SheetState = { editing?: FullVisit; cafe?: Cafe } | null

type Ctx = {
  visits: FullVisit[] | null
  error: string
  reload: () => void
  openLog: (cafe?: Cafe) => void
  openEdit: (v: FullVisit) => void
}

const VisitsContext = createContext<Ctx | null>(null)

export function VisitsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [visits, setVisits] = useState<FullVisit[] | null>(null)
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState<SheetState>(null)

  const reload = useCallback(() => {
    myVisits(userId).then((v) => { setVisits(v); setError('') }).catch((e: Error) => setError(e.message))
  }, [userId])
  useEffect(() => { reload() }, [reload])

  const value: Ctx = {
    visits, error, reload,
    openLog: (cafe) => setSheet({ cafe }),
    openEdit: (v) => setSheet({ editing: v }),
  }

  return (
    <VisitsContext.Provider value={value}>
      {children}
      {sheet && (
        <LogSheet
          key={sheet.editing?.id ?? sheet.cafe?.id ?? 'new'}
          userId={userId}
          editing={sheet.editing}
          cafe={sheet.cafe}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); reload() }}
        />
      )}
    </VisitsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVisits() {
  const ctx = useContext(VisitsContext)
  if (!ctx) throw new Error('useVisits must be used inside <VisitsProvider>')
  return ctx
}
