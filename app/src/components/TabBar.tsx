import { NavLink } from 'react-router-dom'
import { useVisits } from '../data/VisitsProvider'

const tab = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab active' : 'tab')

export function TabBar() {
  const { openLog } = useVisits()
  return (
    <nav className="tabbar" aria-label="Main">
      <NavLink to="/" end className={tab}>Notebook</NavLink>
      <NavLink to="/feed" className={tab}>Feed</NavLink>
      <button className="fab" aria-label="Brew it" onClick={() => openLog()}>+</button>
      <NavLink to="/people" className={tab}>People</NavLink>
      <NavLink to="/you" className={tab}>You</NavLink>
    </nav>
  )
}
