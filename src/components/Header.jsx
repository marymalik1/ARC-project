import { Bell, ChevronDown, Menu } from 'lucide-react'
import { DEMO_USER } from '../lib/demo-auth'

export default function Header({ onMenu, notifications = 0, user = DEMO_USER }) {
  const count = Number(notifications) || 0
  const label = count === 1 ? '1 notification' : `${count} notifications`

  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </button>
      <div className="profile-area">
        <button className="notification-button" type="button" aria-label={label}>
          <Bell />
          {count > 0 && <span aria-hidden="true">{count > 99 ? '99+' : count}</span>}
        </button>
        <div className="profile-divider" />
        <button className="profile-button" type="button">
          <img className="profile-avatar" src={user.avatar} alt={user.name} />
          <span>{user.name}</span>
          <ChevronDown size={18} />
        </button>
      </div>
    </header>
  )
}
