"use client"

import { useMemo, useState } from 'react'
import { emptyFilters, filterDealers } from '../lib/dealers'
import AccountModal from './AccountModal'
import DealersTable from './DealersTable'
import Filters from './Filters'
import Header from './Header'
import Sidebar from './Sidebar'
import StatsGrid from './StatsGrid'

export default function UserManagement({ initialDealers }) {
  const [dealers, setDealers] = useState(() => initialDealers)
  const [filters, setFilters] = useState(emptyFilters)
  const [submittedFilters, setSubmittedFilters] = useState(emptyFilters)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [requestError, setRequestError] = useState('')

  const visibleDealers = useMemo(
    () => filterDealers(dealers, submittedFilters),
    [dealers, submittedFilters],
  )

  const changeFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setSubmittedFilters(emptyFilters)
  }

  const exportCsv = () => {
    const header = 'Dealer Code,Dealer Name,Region,Zone,Territory,Status,Created On'
    const rows = visibleDealers.map((dealer) => Object.values(dealer).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'arc-dealer-accounts.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const saveDealer = async (dealer) => {
    const editing = modal?.mode === 'edit'
    const endpoint = editing ? `/api/dealers/${dealer.code}` : '/api/dealers'

    try {
      setRequestError('')
      const response = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealer),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to save this account.')
      }

      setDealers((current) => {
        const exists = current.some((item) => item.code === body.dealer.code)
        return exists
          ? current.map((item) => item.code === body.dealer.code ? body.dealer : item)
          : [body.dealer, ...current]
      })
      setModal(null)
    } catch (error) {
      setRequestError(error.message)
    }
  }

  const deleteDealer = async (code) => {
    try {
      setRequestError('')
      const response = await fetch(`/api/dealers/${code}`, { method: 'DELETE' })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to delete this account.')
      }

      setDealers((current) => current.filter((dealer) => dealer.code !== code))
    } catch (error) {
      setRequestError(error.message)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-shell">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="content">
          <div className="page-heading">
            <h1>User Management</h1>
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span>Home</span>
              <span aria-hidden="true">›</span>
              <strong>User Management</strong>
            </div>
          </div>
          <StatsGrid />
          <Filters
            values={filters}
            onChange={changeFilter}
            onSearch={() => setSubmittedFilters(filters)}
            onClear={clearFilters}
            onExport={exportCsv}
            onCreate={() => setModal({ mode: 'create' })}
          />
          <DealersTable
            dealers={visibleDealers}
            onEdit={(dealer) => setModal({ mode: 'edit', dealer })}
            onDelete={deleteDealer}
          />
          <p className="request-error" role="alert" aria-live="polite">{requestError}</p>
        </main>
      </div>
      {modal && (
        <AccountModal
          dealer={modal.dealer}
          onClose={() => setModal(null)}
          onSave={saveDealer}
        />
      )}
    </div>
  )
}
