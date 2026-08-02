import { Eye, EyeOff, X } from 'lucide-react'
import { useState } from 'react'
import { MIN_PASSWORD_LENGTH } from '../lib/dealers'
import { USER_ROLES, roleLabels } from '../lib/permissions'

export default function TeamMemberModal({ member, onClose, onSave }) {
  const editing = Boolean(member)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [values, setValues] = useState({
    name: member?.name ?? '',
    email: member?.email ?? '',
    role: member?.role ?? 'CUSTOMER_SUPPORT',
    status: member?.status ?? 'Active',
    password: '',
  })

  const update = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
    setFormError('')
  }

  function submit(event) {
    event.preventDefault()

    if (!values.name.trim()) {
      return setFormError('Name is required.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return setFormError('Enter a valid email address.')
    }

    if (!editing && !values.password) {
      return setFormError('A password is required for a new teammate.')
    }

    if (values.password && values.password.length < MIN_PASSWORD_LENGTH) {
      return setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }

    return onSave(values)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="team-modal-title">{editing ? 'Edit Teammate' : 'Add Teammate'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"><X /></button>
        </div>

        <form onSubmit={submit}>
          <label>
            Name
            <input name="name" value={values.name} onChange={update('name')} placeholder="Enter name" />
          </label>
          <label>
            Email Address
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={update('email')}
              placeholder="Enter email address"
            />
          </label>
          <label>
            Role
            <select name="role" value={values.role} onChange={update('role')}>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" value={values.status} onChange={update('status')}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label>
            Password
            <span className="modal-password">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={update('password')}
                placeholder={editing ? 'Leave blank to keep current' : 'Enter password'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            <small className="modal-hint">
              {editing
                ? 'Only set this to replace the existing password.'
                : `At least ${MIN_PASSWORD_LENGTH} characters.`}
            </small>
          </label>

          {formError && <p className="modal-error" role="alert">{formError}</p>}

          <div className="modal-actions">
            <button className="button button--secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">
              {editing ? 'Save changes' : 'Add Teammate'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
