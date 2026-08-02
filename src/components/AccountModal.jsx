import { Check, Eye, EyeOff, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { MIN_PASSWORD_LENGTH, dealerRoles, emptyFacets } from '../lib/dealers'

const steps = ['Personal info', 'Role']

export default function AccountModal({
  dealer,
  facets = emptyFacets,
  onClose,
  onSave,
  onDelete,
}) {
  const editing = Boolean(dealer)
  const [step, setStep] = useState(0)
  const [stepError, setStepError] = useState('')
  const [verified, setVerified] = useState(dealer?.verified ?? false)
  const [status, setStatus] = useState(dealer?.status || 'Active')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Controlled rather than reading FormData on submit: the fields for the step
  // you are not on get unmounted, so their values have to live outside the DOM.
  const [values, setValues] = useState({
    code: dealer?.code ?? '',
    name: dealer?.name ?? '',
    email: dealer?.email ?? '',
    region: dealer?.region ?? '',
    zone: dealer?.zone ?? '',
    territory: dealer?.territory ?? '',
    role: dealer?.role ?? '',
    storeCode: dealer?.storeCode ?? '',
    // Never pre-filled: the server only ever returns the hash's absence, so a
    // blank box means "leave whatever is stored alone".
    password: '',
  })

  const update = (key) => (event) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
    setStepError('')
  }

  function validatePersonalInfo() {
    if (!editing && !/^D\d{5}$/.test(values.code.trim().toUpperCase())) {
      return 'Dealer code must use the format D00123.'
    }

    for (const [key, label] of [
      ['name', 'Name'],
      ['region', 'Region'],
      ['zone', 'Zone'],
      ['territory', 'Territory'],
    ]) {
      if (!values[key].trim()) return `${label} is required.`
    }

    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return 'Enter a valid email address.'
    }

    if (values.password && values.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }

    return ''
  }

  function validateRole() {
    if (values.storeCode.trim() && !/^\d+$/.test(values.storeCode.trim())) {
      return 'Store code must contain digits only.'
    }

    return ''
  }

  function goNext() {
    const message = validatePersonalInfo()

    if (message) {
      setStepError(message)
      return
    }

    setStepError('')
    setStep(1)
  }

  function submit(event) {
    event.preventDefault()

    // Guard the whole form, not just the visible step — someone can reach Save
    // and then go back and clear a field.
    const message = validatePersonalInfo()

    if (message) {
      setStepError(message)
      setStep(0)
      return
    }

    const roleMessage = validateRole()

    if (roleMessage) {
      setStepError(roleMessage)
      return
    }

    onSave({ ...values, status, verified })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title">{editing ? 'Edit Account' : 'Create Account'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog"><X /></button>
        </div>

        {/* Verification and status apply to the account as a whole, so they sit
            outside the steps and are settable when creating one too. */}
        <div className="modal-verify">
          <div className="modal-verify-choice" role="radiogroup" aria-label="Verification">
            <label>
              <input
                type="radio"
                name="verified"
                checked={verified}
                onChange={() => setVerified(true)}
              />
              Verified User
            </label>
            <label>
              <input
                type="radio"
                name="verified"
                checked={!verified}
                onChange={() => setVerified(false)}
              />
              Unverified User
            </label>
          </div>
          <label className="modal-status-select">
            <span>Status</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>

        {/* A shortcut for the common review action; only meaningful on an
            existing account that has not been verified yet. */}
        {editing && !verified && (
          <div className="modal-verify modal-verify--secondary">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setVerified(true)}
            >
              Verify user
            </button>
          </div>
        )}

        <ol className="stepper" aria-label="Form steps">
          {steps.map((label, index) => (
            <li
              key={label}
              className={`stepper-step ${index === step ? 'stepper-step--active' : ''} ${index < step ? 'stepper-step--done' : ''}`}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="stepper-marker">
                {index < step ? <Check size={16} /> : index + 1}
              </span>
              <span className="stepper-label">{label}</span>
            </li>
          ))}
        </ol>

        <form onSubmit={submit}>
          {step === 0 ? (
            <>
              <label>
                Dealer Code
                <input
                  name="code"
                  value={values.code}
                  onChange={update('code')}
                  disabled={editing}
                  placeholder="D00123"
                />
              </label>
              <label>
                Region
                <input name="region" list="region-options" value={values.region} onChange={update('region')} />
              </label>
              <label>
                Name
                <input name="name" value={values.name} onChange={update('name')} placeholder="Enter name" />
              </label>
              <label>
                Zone
                <input name="zone" list="zone-options" value={values.zone} onChange={update('zone')} />
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
                Territory
                <input
                  name="territory"
                  list="territory-options"
                  value={values.territory}
                  onChange={update('territory')}
                />
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
                    : `At least ${MIN_PASSWORD_LENGTH} characters. Optional — dealers can set their own on first sign-in.`}
                </small>
              </label>
            </>
          ) : (
            <>
              <label>
                Role
                <select name="role" value={values.role} onChange={update('role')}>
                  <option value="">Select role</option>
                  {dealerRoles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
              <label>
                Store Code
                <input
                  name="storeCode"
                  value={values.storeCode}
                  onChange={update('storeCode')}
                  inputMode="numeric"
                  placeholder="Digits only"
                />
              </label>

              {editing && (
                <>
                  {/* Status now lives beside Verification at the top, so it is
                      set in one place for both creating and editing. */}
                  <h3 className="modal-section">Created by</h3>
                  <p className="modal-meta">
                    {dealer.createdBy || 'Not recorded'}
                    {dealer.createdAt && <span> · {dealer.createdAt}</span>}
                  </p>
                  {verified && dealer.verifiedBy && (
                    <p className="modal-meta">Verified by {dealer.verifiedBy}</p>
                  )}
                </>
              )}
            </>
          )}

          <datalist id="region-options">
            {facets.regions.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="zone-options">
            {facets.zones.map((option) => <option key={option} value={option} />)}
          </datalist>
          <datalist id="territory-options">
            {facets.territories.map((option) => <option key={option} value={option} />)}
          </datalist>

          {stepError && (
            <p className="modal-error" role="alert">{stepError}</p>
          )}

          {/* The keys matter. Without them React reconciles step 1's primary
              button into step 2's, mutating type="button" into type="submit" on
              the same DOM node while the click is still resolving — so pressing
              Next would submit the form. Distinct keys swap the node instead. */}
          <div className="modal-actions">
            {/* Sits far left of the footer, away from Save, and asks once before
                it actually deletes. */}
            {editing && (
              <button
                key="delete"
                className={`button button--danger modal-actions-delete ${confirmDelete ? 'button--danger-armed' : ''}`}
                type="button"
                onClick={() => {
                  if (confirmDelete) onDelete?.(dealer.code)
                  else setConfirmDelete(true)
                }}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 size={18} />
                {confirmDelete ? 'Click again to delete' : 'Delete User'}
              </button>
            )}
            {step === 0 ? (
              <>
                <button key="cancel" className="button button--secondary" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button key="next" className="button button--primary" type="button" onClick={goNext}>
                  Next
                </button>
              </>
            ) : (
              <>
                <button key="back" className="button button--secondary" type="button" onClick={() => setStep(0)}>
                  Back
                </button>
                <button key="save" className="button button--primary" type="submit">
                  {editing ? 'Save changes' : 'Save Account'}
                </button>
              </>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
