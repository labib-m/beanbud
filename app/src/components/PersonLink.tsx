import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { displayName, handleText } from '../lib/people'

type Who = { display_name: string | null; handle: string | null } | null | undefined

/** A person's name (and optionally @username) that opens their profile — yours opens You. */
export function PersonLink({ id, profile, you = false, handle = false }: { id: string; profile: Who; you?: boolean; handle?: boolean }) {
  const { session } = useAuth()
  const own = session?.user.id === id
  const at = handle ? handleText(profile) : ''
  return (
    <Link className="person-link" to={own ? '/you' : `/people/${id}`}>
      <b>{own && you ? 'You' : displayName(profile)}</b>
      {at && <span className="person-handle"> {at}</span>}
    </Link>
  )
}
