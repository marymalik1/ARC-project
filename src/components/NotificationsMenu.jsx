"use client"

import { Bell, CheckCheck, MessageSquare, Trash2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { relativeTime } from '../lib/notifications'
import { POLL_INTERVAL_MS } from '../lib/use-live-view'

// The bell polls slower than the page behind it. The badge is ambient
// information, and it should not double the query load of every screen.
const NOTIFICATION_POLL_MS = POLL_INTERVAL_MS > 0 ? POLL_INTERVAL_MS * 3 : 0

// Read and cleared state live in the browser: there is no per-user notification
// table yet, and a badge that can never be cleared is what makes a bell feel
// decorative. Clearing hides a row from this bell only — the chat or the
// unverified account it points at is untouched, and still on its own page.
const SEEN_STORAGE_KEY = 'arc.notifications.seen'
const CLEARED_STORAGE_KEY = 'arc.notifications.cleared'

const icons = { support: MessageSquare, registration: UserPlus }

// Read on the very first client render rather than in an effect: the server has
// no storage to read, and nothing rendered before the first fetch depends on it.
function readIds(key) {
  if (typeof window === 'undefined') {
    return new Set()
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function writeIds(key, ids) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Storage can be refused (private mode, full quota). The bell still works;
    // it just starts over on the next visit.
  }
}

/**
 * The header bell and its dropdown.
 *
 * `initialCount` is the pending figure the server already rendered, so the badge
 * is right on first paint; the first fetch replaces it with the number of items
 * this browser has not marked read yet.
 */
export default function NotificationsMenu({ initialCount = 0 }) {
  const [open, setOpen] = useState(false)
  // null until the first read lands, so the badge can fall back to the count the
  // server rendered instead of flashing zero.
  const [notifications, setNotifications] = useState(null)
  const [seen, setSeen] = useState(() => readIds(SEEN_STORAGE_KEY))
  const [cleared, setCleared] = useState(() => readIds(CLEARED_STORAGE_KEY))
  const [error, setError] = useState('')

  const wrapRef = useRef(null)
  const requestRef = useRef(null)
  const startedRef = useRef(false)

  const refresh = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    try {
      const response = await fetch('/api/notifications', {
        signal: controller.signal,
        cache: 'no-store',
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to load notifications.')
      }

      setNotifications(body.notifications ?? [])
      setError('')
      return body.notifications ?? []
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message)
      }

      return null
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
      }
    }
  }, [])

  // Only what is still in the feed is remembered: an item that leaves has been
  // dealt with, and a chat that reopens deserves to announce itself again.
  const remember = useCallback((known, ids) => {
    const live = new Set((notifications ?? []).map((item) => item.id))
    return [...new Set([...known, ...ids])].filter((id) => live.has(id))
  }, [notifications])

  const markRead = useCallback((ids) => {
    const next = remember(seen, ids)

    setSeen(new Set(next))
    writeIds(SEEN_STORAGE_KEY, next)
  }, [remember, seen])

  const clear = useCallback((ids) => {
    const next = remember(cleared, ids)

    setCleared(new Set(next))
    writeIds(CLEARED_STORAGE_KEY, next)
  }, [remember, cleared])

  // One read on mount; everything after it comes from the poll, the tab regaining
  // focus, or the reader opening the panel.
  useEffect(() => {
    if (startedRef.current) {
      return
    }

    startedRef.current = true
    refresh()
  }, [refresh])

  useEffect(() => {
    if (NOTIFICATION_POLL_MS <= 0) {
      return undefined
    }

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }, NOTIFICATION_POLL_MS)

    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('focus', syncWhenVisible)
    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.removeEventListener('focus', syncWhenVisible)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const closeOnOutsideClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [open])

  useEffect(() => () => requestRef.current?.abort(), [])

  // Cleared rows leave the bell entirely; new work still arrives under new ids.
  const visible = (notifications ?? []).filter((item) => !cleared.has(item.id))
  const unread = visible.filter((item) => !seen.has(item.id))
  const count = notifications === null ? Number(initialCount) || 0 : unread.length
  const wasCleared = notifications !== null && notifications.length > 0 && visible.length === 0

  // Reading the list is not the same as dealing with it, so the badge only ever
  // clears on purpose: by following a notification, or by marking them all read.
  const toggle = () => {
    setOpen(!open)

    if (!open) {
      refresh()
    }
  }

  const label = count === 1 ? '1 new notification' : `${count} new notifications`

  return (
    <div className="notification-wrap" ref={wrapRef}>
      <button
        className="notification-button"
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        <Bell />
        {count > 0 && <span aria-hidden="true">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <section className="notification-panel" id="notification-panel" aria-label="Notifications">
          <header className="notification-panel-header">
            <h3>Notifications</h3>
            {visible.length > 0 ? (
              <div className="notification-panel-actions">
                <button
                  className="notification-action"
                  type="button"
                  disabled={count === 0}
                  onClick={() => markRead(unread.map((item) => item.id))}
                >
                  <CheckCheck aria-hidden="true" />
                  Mark all read
                </button>
                <button
                  className="notification-action notification-action--clear"
                  type="button"
                  onClick={() => clear(visible.map((item) => item.id))}
                >
                  <Trash2 aria-hidden="true" />
                  Clear all
                </button>
              </div>
            ) : (
              <span>All caught up</span>
            )}
          </header>

          {error && <p className="notification-message notification-message--error">{error}</p>}

          {!error && notifications === null && (
            <p className="notification-message">Loading notifications…</p>
          )}

          {!error && notifications?.length === 0 && (
            <p className="notification-message">Nothing needs your attention right now.</p>
          )}

          {!error && wasCleared && (
            <p className="notification-message">Cleared. New activity will show up here.</p>
          )}

          {visible.length > 0 && (
            <ul className="notification-list">
              {visible.map((item) => {
                const Icon = icons[item.kind] ?? Bell
                const unseen = !seen.has(item.id)

                const follow = () => {
                  markRead([item.id])
                  setOpen(false)
                }

                return (
                  <li
                    key={item.id}
                    className={`notification-item ${unseen ? 'notification-item--unread' : ''}`}
                  >
                    <Link href={item.href} onClick={follow}>
                      <span className="notification-icon" aria-hidden="true"><Icon /></span>
                      <span className="notification-copy">
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                        <time dateTime={item.at}>{relativeTime(item.at)}</time>
                      </span>
                      {unseen && <span className="notification-dot" aria-label="Unread" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
