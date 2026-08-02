import {
  CircleDollarSign,
  Headphones,
  LogOut,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { CAPABILITIES, can } from '../lib/permissions'
import ArcLogo from './ArcLogo'

const navItems = [
  { label: 'User Management', icon: UsersRound, page: 'users', href: '/', capability: CAPABILITIES.USERS_VIEW },
  { label: 'Customer Care', icon: Headphones, page: 'customer-care', href: '/customer-care', capability: CAPABILITIES.CARE_VIEW },
  { label: 'Team', icon: ShieldCheck, page: 'team', href: '/team', capability: CAPABILITIES.ADMIN },
  // Placeholder modules — admin-only until they are built out.
  { label: 'Finance', icon: CircleDollarSign, page: 'finance', href: '#finance', capability: CAPABILITIES.ADMIN },
  { label: 'Settings', icon: Settings, page: 'settings', href: '#settings', capability: CAPABILITIES.ADMIN },
]

export default function Sidebar({ activePage = 'users', open, onClose, user }) {
  const visibleItems = navItems.filter((item) => can(user, item.capability))
  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close menu">
          <X size={24} />
        </button>
        <ArcLogo />
        <div className="sidebar-rule" />
        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleItems.map(({ label, icon: Icon, page, href }) => (
            <Link
              className={`nav-item ${activePage === page ? 'nav-item--active' : ''}`}
              href={href}
              key={label}
              onClick={onClose}
            >
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
