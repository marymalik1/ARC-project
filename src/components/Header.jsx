import { Menu } from 'lucide-react'
import NotificationsMenu from './NotificationsMenu'

// Rendered only until the server-supplied user arrives; every authenticated page
// passes the real one down from getCurrentUser().
const UNKNOWN_USER = Object.freeze({ name: 'Signed in', avatar: '/assets/maryam-avatar.png' })

export default function Header({ onMenu, menuExpanded = true, notifications = 0, user }) {
  const account = user ?? UNKNOWN_USER

  return (
    <header className="topbar">
      <button
        className="icon-button menu-button"
        type="button"
        onClick={onMenu}
        aria-label="Toggle menu"
        aria-expanded={menuExpanded}
      >
        <Menu />
      </button>
      <div className="profile-area">
        <NotificationsMenu initialCount={notifications} />
        <div className="profile-divider" />
        {/* Identity only — the account itself has no menu behind it, so it is not
            a control. Signing out lives in the sidebar. */}
        <div className="profile-identity">
          <img className="profile-avatar" src={account.avatar} alt="" />
          <span>{account.name}</span>
        </div>
      </div>
    </header>
  )
}
