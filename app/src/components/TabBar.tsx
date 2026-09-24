import { NavLink } from 'react-router-dom'
import { useBrewWire } from '../data/BrewWireProvider'
import { useVisits } from '../data/VisitsProvider'

const tab = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab active' : 'tab')

export function TabBar() {
  const { openLog } = useVisits()
  const { unreadCount } = useBrewWire()
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" end className={tab}>Notebook</NavLink>
      <NavLink to="/feed" className={tab}>
        Feed
        {unreadCount > 0 && <span className="tab-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </NavLink>
      <button className="fab" aria-label="Brew it" onClick={() => openLog()}>+</button>
      <NavLink to="/people" className={tab}>People</NavLink>
      <NavLink to="/you" className={tab}>You</NavLink>
    </nav>
  )
}
