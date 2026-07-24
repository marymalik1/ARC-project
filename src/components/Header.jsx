import { Bell, ChevronDown, Menu } from 'lucide-react'

export default function Header({ onMenu }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" type="button" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </button>
      <div className="profile-area">
        <button className="notification-button" type="button" aria-label="3 notifications">
          <Bell />
          <span>3</span>
        </button>
        <div className="profile-divider" />
        <button className="profile-button" type="button">
          <img className="profile-avatar" src="/assets/maryam-avatar.png" alt="Maryam" />
          <span>Maryam</span>
          <ChevronDown size={18} />
        </button>
      </div>
    </header>
  )
}
