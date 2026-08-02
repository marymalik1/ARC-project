'use client'

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'arc:sidebar-collapsed'
const DESKTOP = '(min-width: 901px)'

/*
 * The desktop rail lives in a module-level store rather than component state so
 * it survives navigation between routes, and in localStorage so it survives a
 * reload. useSyncExternalStore reads it without a hydration mismatch: the server
 * snapshot is always "expanded", and React re-renders with the stored value once
 * it hydrates.
 */
let collapsed = false
let loaded = false
const listeners = new Set()

function getSnapshot() {
  if (!loaded) {
    loaded = true
    try {
      collapsed = window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      // Private mode or blocked storage — fall back to the expanded default.
    }
  }
  return collapsed
}

function getServerSnapshot() {
  return false
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setCollapsed(next) {
  collapsed = next
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // Nothing to persist to; the in-memory value still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

const ShellContext = createContext(null)

export function ShellProvider({ children }) {
  const collapsedNow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // The mobile drawer is deliberately NOT persisted — it closes on navigation so
  // it never covers the page it just opened.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Enabled by the first toggle, so a rail restored from storage lands in place
  // on load instead of animating out from the expanded width.
  const [animate, setAnimate] = useState(false)

  const toggle = useCallback(() => {
    setAnimate(true)
    if (window.matchMedia(DESKTOP).matches) {
      setCollapsed(!collapsed)
    } else {
      setDrawerOpen((open) => !open)
    }
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <ShellContext.Provider
      value={{ collapsed: collapsedNow, drawerOpen, animate, toggle, closeDrawer }}
    >
      {children}
    </ShellContext.Provider>
  )
}

export function useShell() {
  const value = useContext(ShellContext)
  if (!value) throw new Error('useShell must be used inside a ShellProvider')
  return value
}
