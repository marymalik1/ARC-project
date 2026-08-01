"use client"

import { useState } from 'react'
import {
  MAX_PAGE_SIZE,
  emptyFilters,
  filtersToSearchParams,
} from '../lib/dealers'
import { useDealerView } from '../lib/use-dealer-view'
import AccountModal from './AccountModal'
import DealersTable from './DealersTable'
import Filters from './Filters'
import Header from './Header'
import Sidebar from './Sidebar'
import StatsGrid from './StatsGrid'
import SyncStatus from './SyncStatus'

const csvColumns = [
  ['code', 'Dealer Code'],
  ['name', 'Dealer Name'],
  ['region', 'Region'],
  ['zone', 'Zone'],
  ['territory', 'Territory'],
  ['status', 'Status'],
  ['createdOn', 'Created On'],
]

function toCsvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export default function UserManagement({ initialView }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modal, setModal] = useState(null)

  const {
    view,
    appliedFilters,
    applyFilters,
    goToPage,
    error,
    loading,
    refresh,
    setError,
  } = useDealerView({ initialView })

  const changeFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    applyFilters(emptyFilters)
  }

  const exportCsv = async () => {
    try {
      setError('')
      const params = filtersToSearchParams(appliedFilters, 1, MAX_PAGE_SIZE)
      const response = await fetch(`/api/dealers?${params}`, { cache: 'no-store' })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to export dealer accounts.')
      }

      const header = csvColumns.map(([, label]) => label).join(',')
      const rows = body.dealers.map((dealer) =>
        csvColumns.map(([field]) => toCsvCell(dealer[field])).join(','),
      )
      const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'arc-dealer-accounts.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError.message)
    }
  }

  const saveDealer = async (dealer) => {
    const editing = modal?.mode === 'edit'
    const endpoint = editing ? `/api/dealers/${dealer.code}` : '/api/dealers'

    try {
      setError('')
      const response = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealer),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to save this account.')
      }

      setModal(null)
      await refresh({ silent: true })
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const deleteDealer = async (code) => {
    try {
      setError('')
      const response = await fetch(`/api/dealers/${code}`, { method: 'DELETE' })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to delete this account.')
      }

      await refresh({ silent: true })
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-shell">
        <Header
          onMenu={() => setSidebarOpen(true)}
          notifications={view.notifications ?? 0}
        />
        <main className="content">
          <div className="page-heading">
            <h1>User Management</h1>
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span>Home</span>
              <span aria-hidden="true">›</span>
              <strong>User Management</strong>
              <SyncStatus syncedAt={view.syncedAt} loading={loading} />
            </div>
          </div>
          <StatsGrid stats={view.stats} />
          <Filters
            values={filters}
            facets={view.facets}
            onChange={changeFilter}
            onSearch={() => applyFilters(filters)}
            onClear={clearFilters}
            onExport={exportCsv}
            onCreate={() => setModal({ mode: 'create' })}
          />
          <DealersTable
            dealers={view.dealers}
            total={view.total}
            page={view.page}
            pageSize={view.pageSize}
            onPageChange={goToPage}
            onEdit={(dealer) => setModal({ mode: 'edit', dealer })}
            onDelete={deleteDealer}
          />
          <p className="request-error" role="alert" aria-live="polite">{error}</p>
        </main>
      </div>
      {modal && (
        <AccountModal
          dealer={modal.dealer}
          facets={view.facets}
          onClose={() => setModal(null)}
          onSave={saveDealer}
        />
      )}
    </div>
  )
}
