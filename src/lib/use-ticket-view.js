"use client"

import { useCallback, useState } from 'react'
import { EMPTY_TICKET_FILTERS, ticketFiltersToSearchParams } from './tickets'
import { useLiveView } from './use-live-view'

/** Live-synced support chats, tab counts, filter options and tags. */
export function useTicketView({ initialView }) {
  const [request, setRequest] = useState({
    filters: { ...EMPTY_TICKET_FILTERS },
    page: initialView.page,
  })

  const query = ticketFiltersToSearchParams(
    request.filters,
    request.page,
    initialView.pageSize,
  ).toString()

  const syncPage = useCallback((next) => {
    if (next?.page) {
      setRequest((current) => current.page === next.page
        ? current
        : { ...current, page: next.page })
    }
  }, [])

  const { view, error, setError, loading, refresh } = useLiveView({
    endpoint: '/api/tickets',
    query,
    initialView,
    errorMessage: 'Unable to load support chats.',
    onView: syncPage,
  })

  const applyFilters = useCallback((filters) => {
    setRequest({ filters: { ...filters }, page: 1 })
  }, [])

  // The tab and inbox search apply immediately, without the Search button.
  const patchFilters = useCallback((patch) => {
    setRequest((current) => ({ filters: { ...current.filters, ...patch }, page: 1 }))
  }, [])

  const goToPage = useCallback((page) => {
    setRequest((current) => ({ ...current, page }))
  }, [])

  return {
    view,
    appliedFilters: request.filters,
    applyFilters,
    patchFilters,
    goToPage,
    error,
    loading,
    refresh,
    setError,
  }
}
