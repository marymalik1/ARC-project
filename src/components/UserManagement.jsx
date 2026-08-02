"use client"

import { useState } from 'react'
import {
  MAX_PAGE_SIZE,
  emptyFilters,
  filtersToSearchParams,
} from '../lib/dealers'
import { CAPABILITIES, can } from '../lib/permissions'
import { useDealerView } from '../lib/use-dealer-view'
import AccountModal from './AccountModal'
import DealersTable from './DealersTable'
import Filters from './Filters'
import Header from './Header'
import { useShell } from './ShellState'
import Sidebar from './Sidebar'
import StatsGrid from './StatsGrid'
import Toast from './Toast'
import SyncStatus from './SyncStatus'

// Columns and order of the exported file, matching the agreed header row.
const csvColumns = [
  ['code', 'Store/Dealer Code'],
  ['name', 'Dealer Name'],
  ['region', 'Region'],
  ['zone', 'Zone'],
  ['territory', 'Territory'],
  ['createdBy', 'Creator'],
  ['createdAt', 'Date and time Created'],
  ['status', 'Status'],
  ['role', 'Role'],
]

function toCsvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export default function UserManagement({ initialView, user }) {
  const [filters, setFilters] = useState(emptyFilters)
  const { collapsed, drawerOpen, animate, toggle, closeDrawer } = useShell()
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  // Read-only roles get no write affordances. The API enforces this too — hiding
  // the buttons just avoids offering actions that would 403.
  const canManage = can(user, CAPABILITIES.USERS_MANAGE)
  const canExport = can(user, CAPABILITIES.USERS_EXPORT)

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
      // Announced before the request starts — a large export takes a moment, and
      // the browser gives no sign anything is happening until the file lands.
      setToast({ tone: 'busy', message: 'Exporting file…' })
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
      anchor.download = 'fmc-dealer-accounts.csv'
      anchor.click()
      URL.revokeObjectURL(url)

      const count = body.dealers.length
      setToast({
        tone: 'success',
        message: `Exported ${count} ${count === 1 ? 'account' : 'accounts'}.`,
      })
    } catch (exportError) {
      setError(exportError.message)
      setToast({ tone: 'error', message: exportError.message })
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
    <div
      className={`app-shell ${collapsed ? 'app-shell--rail' : ''} ${animate ? 'app-shell--animate' : ''}`}
    >
      <Sidebar open={drawerOpen} onClose={closeDrawer} user={user} />
      <div className="main-shell">
        <Header
          onMenu={toggle}
          menuExpanded={!collapsed}
          notifications={view.notifications ?? 0}
          user={user}
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
            onExport={canExport ? exportCsv : undefined}
            onCreate={canManage ? () => setModal({ mode: 'create' }) : undefined}
          />
          <DealersTable
            dealers={view.dealers}
            total={view.total}
            page={view.page}
            pageSize={view.pageSize}
            onPageChange={goToPage}
            onEdit={canManage ? (dealer) => setModal({ mode: 'edit', dealer }) : undefined}
            onDelete={canManage ? deleteDealer : undefined}
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
          onDelete={(code) => {
            setModal(null)
            deleteDealer(code)
          }}
        />
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
