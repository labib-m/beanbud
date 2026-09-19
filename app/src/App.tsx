import { useState, type ReactNode } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { TabBar } from './components/TabBar'
import { VisitsProvider } from './data/VisitsProvider'
import { fetchMyProfile } from './data/social'
import { useLoad } from './data/useLoad'
import { emptyProfile } from './lib/people'
import { Onboarding } from './screens/Onboarding'
import { CafeDetail } from './screens/CafeDetail'
import { Feed } from './screens/Feed'
import { Notebook } from './screens/Notebook'
import { People } from './screens/People'
import { PersonProfile } from './screens/PersonProfile'
import { Placeholder } from './screens/Placeholder'
import { SetPin } from './screens/SetPin'
import { SignIn } from './screens/SignIn'
import { You } from './screens/You'

/** Holds the app back until the person has chosen a username and display name. */
function ProfileGate({ userId, hasPin, mustChangePin, children }: { userId: string; hasPin: boolean; mustChangePin: boolean; children: ReactNode }) {
  const [tick, setTick] = useState(0)
  const { data: profile, error, loading } = useLoad(() => fetchMyProfile(userId), [userId, tick])

  if (error) {
    return (
      <main className="screen center">
        <p className="error" role="alert">{error}</p>
        <button className="btn ghost" onClick={() => setTick((t) => t + 1)}>Try again</button>
      </main>
    )
  }
  if (loading && !profile) return <main className="screen center"><p className="muted">Loading…</p></main>

  const p = profile ?? emptyProfile(userId)
  if (!p.handle || !p.display_name) {
    return <Onboarding profile={p} onDone={() => setTick((t) => t + 1)} />
  }
  // No PIN yet (an older account), or the developer just gave them a temporary one.
  if (!hasPin || mustChangePin) {
    return (
      <main className="screen center">
        <SetPin first={!hasPin} onDone={() => setTick((t) => t + 1)} />
      </main>
    )
  }
  return <>{children}</>
}

function Shell() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <main className="screen center"><p className="muted">Loading…</p></main>
  if (!session) return <SignIn />

  return (
    <ProfileGate
      userId={session.user.id}
      hasPin={session.user.app_metadata?.has_pin === true}
      mustChangePin={session.user.app_metadata?.must_change_pin === true}
    >
    <VisitsProvider userId={session.user.id}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Notebook />} />
          <Route path="cafe/:cafeId" element={<CafeDetail />} />
          <Route path="feed" element={<Feed />} />
          <Route path="people" element={<People />} />
          <Route path="people/:userId" element={<PersonProfile />} />
          <Route path="you" element={<You />} />
          <Route path="*" element={<Placeholder title="Not found" blurb="There's nothing at this address." />} />
        </Route>
      </Routes>
    </VisitsProvider>
    </ProfileGate>
  )
}
