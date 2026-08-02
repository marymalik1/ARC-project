'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { roleLabels } from '../lib/permissions'
import Header from './Header'
import { useShell } from './ShellState'
import Sidebar from './Sidebar'
import TeamMemberModal from './TeamMemberModal'

export default function TeamManagement({ initialUsers = [], user }) {
  const { collapsed, drawerOpen, animate, toggle, closeDrawer } = useShell()
  const [users, setUsers] = useState(initialUsers)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  // The page renders with force-dynamic, so the server delivers a fresh list on
  // load; this only re-reads after a change.
  const refresh = async () => {
    try {
      const response = await fetch('/api/users', { cache: 'no-store' })
      const body = await response.json()

      if (!response.ok) throw new Error(body.error || 'Unable to load teammates.')

      setUsers(body.users)
    } catch (loadError) {
      setError(loadError.message)
    }
  }

  const save = async (member) => {
    const editing = modal?.mode === 'edit'
    const endpoint = editing ? `/api/users/${modal.member.id}` : '/api/users'

    try {
      setError('')
      const response = await fetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      })
      const body = await response.json()

      if (!response.ok) throw new Error(body.error || 'Unable to save this teammate.')

      setModal(null)
      await refresh()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const remove = async (id) => {
    try {
      setError('')
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Unable to delete this teammate.')
      }

      await refresh()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div
      className={`app-shell ${collapsed ? 'app-shell--rail' : ''} ${animate ? 'app-shell--animate' : ''}`}
    >
      <Sidebar activePage="team" open={drawerOpen} onClose={closeDrawer} user={user} />
      <div className="main-shell">
        <Header onMenu={toggle} menuExpanded={!collapsed} user={user} />
        <main className="content">
          <div className="page-heading">
            <h1>Team</h1>
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span>Home</span>
              <span>❯</span>
              <strong>Team</strong>
            </div>
          </div>

          <section className="table-card team-card">
            <div className="team-toolbar">
              <p>Staff accounts and the role each one signs in with.</p>
              <button
                className="button button--primary"
                type="button"
                onClick={() => setModal({ mode: 'create' })}
              >
                <Plus aria-hidden="true" />
                <span>Add Teammate</span>
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? users.map((member) => (
                  <tr key={member.id}>
                    <td data-label="Name">{member.name}</td>
                    <td data-label="Email">{member.email}</td>
                    <td data-label="Role">{roleLabels[member.role] ?? member.role}</td>
                    <td data-label="Status">
                      <span className={`status status--${member.status.toLowerCase()}`}>
                        <span />
                        {member.status}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'edit', member })}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="delete-action"
                          type="button"
                          onClick={() => remove(member.id)}
                          aria-label={`Delete ${member.name}`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="empty-row" colSpan="5">No teammates yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <p className="request-error" role="alert" aria-live="polite">{error}</p>
        </main>
      </div>
      {modal && (
        <TeamMemberModal
          member={modal.member}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  )
}
