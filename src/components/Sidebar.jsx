import {
  CircleDollarSign,
  Headphones,
  LogOut,
  Settings,
  UsersRound,
  X,
} from 'lucide-react'
import ArcLogo from './ArcLogo'

const navItems = [
  { label: 'User Management', icon: UsersRound, active: true },
  { label: 'Customer Care', icon: Headphones },
  { label: 'Finance', icon: CircleDollarSign },
  { label: 'Settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close menu">
          <X size={24} />
        </button>
        <ArcLogo />
        <div className="sidebar-rule" />
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, active }) => (
            <a className={`nav-item ${active ? 'nav-item--active' : ''}`} href={`#${label}`} key={label}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <a className="nav-item logout-link" href="#logout">
          <LogOut aria-hidden="true" />
          <span>Logout</span>
        </a>
        <footer className="sidebar-footer">
          <span>© 2025 ARC</span>
          <span>All rights reserved.</span>
        </footer>
      </aside>
      {open && <button className="sidebar-scrim" type="button" onClick={onClose} aria-label="Close menu" />}
    </>
  )
}
