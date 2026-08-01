"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

const parsedInterval = Number.parseInt(process.env.NEXT_PUBLIC_ARC_POLL_MS ?? '', 10)

// How often a live view re-reads the database while the tab is visible.
export const POLL_INTERVAL_MS = Number.isFinite(parsedInterval) ? parsedInterval : 10_000

/**
 * Shared live-sync engine for the dashboard screens. Re-reads `endpoint?query`
 * whenever the query moves, on a background interval, and whenever the tab
 * regains focus — so edits made by another user show up without a reload.
 */
export function useLiveView({ endpoint, query, initialView, errorMessage, onView }) {
  const [view, setView] = useState(initialView)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestRef = useRef(null)
  const initialQueryRef = useRef(query)
  const hydratedRef = useRef(false)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    if (!silent) {
      setLoading(true)
    }

    try {
      const response = await fetch(`${endpoint}?${query}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || errorMessage)
      }

      setView(body)
      setError('')
      onView?.(body)
      return body
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message)
      }

      return null
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }, [endpoint, query, errorMessage, onView])

  // The server already rendered the first view, so only fetch once the query moves.
  useEffect(() => {
    if (!hydratedRef.current && query === initialQueryRef.current) {
      hydratedRef.current = true
      return
    }

    hydratedRef.current = true
    refresh()
  }, [query, refresh])

  useEffect(() => {
    if (POLL_INTERVAL_MS <= 0) {
      return undefined
    }

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true })
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh({ silent: true })
      }
    }

    window.addEventListener('focus', syncWhenVisible)
    document.addEventListener('visibilitychange', syncWhenVisible)

    return () => {
      window.removeEventListener('focus', syncWhenVisible)
      document.removeEventListener('visibilitychange', syncWhenVisible)
    }
  }, [refresh])

  useEffect(() => () => requestRef.current?.abort(), [])

  return { view, setView, error, setError, loading, refresh }
}
