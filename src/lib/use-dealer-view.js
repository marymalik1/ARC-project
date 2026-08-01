"use client"

import { useCallback, useState } from 'react'
import { emptyFilters, filtersToSearchParams } from './dealers'
import { useLiveView } from './use-live-view'

export { POLL_INTERVAL_MS } from './use-live-view'

/** Live-synced dealer accounts, stat cards, filter options and pagination. */
export function useDealerView({ initialView }) {
  const [request, setRequest] = useState({
    filters: emptyFilters,
    page: initialView.page,
  })

  const query = filtersToSearchParams(
    request.filters,
    request.page,
    initialView.pageSize,
  ).toString()

  // Follow the server when it clamps the page — deleting the last row of the
  // last page should land on the page that now exists.
  const syncPage = useCallback((next) => {
    if (next?.page) {
      setRequest((current) => current.page === next.page
        ? current
        : { ...current, page: next.page })
    }
  }, [])

  const { view, error, setError, loading, refresh } = useLiveView({
    endpoint: '/api/dealers',
    query,
    initialView,
    errorMessage: 'Unable to load dealer accounts.',
    onView: syncPage,
  })

  const applyFilters = useCallback((filters) => {
    setRequest({ filters, page: 1 })
  }, [])

  const goToPage = useCallback((page) => {
    setRequest((current) => ({ ...current, page }))
  }, [])

  return {
    view,
    appliedFilters: request.filters,
    applyFilters,
    goToPage,
    error,
    loading,
    refresh,
    setError,
  }
}
