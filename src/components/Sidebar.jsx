import {
  CircleDollarSign,
  Headphones,
  LogOut,
  Settings,
  UsersRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import ArcLogo from './ArcLogo'

const navItems = [
  { label: 'User Management', icon: UsersRound, page: 'users', href: '/' },
  { label: 'Customer Care', icon: Headphones, page: 'customer-care', href: '/customer-care' },
  { label: 'Finance', icon: CircleDollarSign, page: 'finance', href: '#finance' },
  { label: 'Settings', icon: Settings, page: 'settings', href: '#settings' },
]

export default function Sidebar({ activePage = 'users', open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close menu">
          <X size={24} />
        </button>
        <ArcLogo />
        <div className="sidebar-rule" />
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, page, href }) => (
            <Link className={`nav-item ${activePage === page ? 'nav-item--active' : ''}`} href={href} key={label}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <form className="logout-form" action="/api/demo-auth/logout" method="post">
          <button className="nav-item logout-link" type="submit">
            <LogOut aria-hidden="true" />
            <span>Logout</span>
          </button>
        </form>
        <footer className="sidebar-footer">
          <span>© 2025 ARC</span>
          <span>All rights reserved.</span>
        </footer>
      </aside>
      {open && <button className="sidebar-scrim" type="button" onClick={onClose} aria-label="Close menu" />}
    </>
  )
}
