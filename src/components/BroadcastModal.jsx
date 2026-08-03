"use client"

import { CircleX, Megaphone, Paperclip, Send, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatBytes, isImageAttachment, validateBroadcastFile } from '../lib/attachments'
import { broadcastSubmitState } from '../lib/broadcasts'

/**
 * Sends one file or image to every verified, active dealer.
 *
 * Its own component and its own endpoint rather than a mode of the composer:
 * this writes to every dealer at once, and that is worth keeping separate from
 * replying to the chat you happen to have open.
 */
export default function BroadcastModal({ onClose, onSent }) {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState(null)
  const [storage, setStorage] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const fileRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) {
      return
    }

    loadedRef.current = true

    fetch('/api/broadcasts', { cache: 'no-store' })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          throw new Error(body.error || 'Unable to count recipients.')
        }

        setRecipients(body.recipients)
        setStorage(body.storage !== false)
      })
      .catch((countError) => setError(countError.message))
  }, [])

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const pickFile = (event) => {
    const chosen = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!chosen) {
      return
    }

    const check = validateBroadcastFile(chosen)

    if (!check.ok) {
      setError(check.error)
      return
    }

    setError('')
    setFile(chosen)
  }

  const send = async (event) => {
    event.preventDefault()
    const check = validateBroadcastFile(file)

    if (!check.ok) {
      setError(check.error)
      return
    }

    try {
      setError('')
      setSending(true)

      const form = new FormData()
      form.set('file', file)
      form.set('message', message.trim())

      const response = await fetch('/api/broadcasts', { method: 'POST', body: form })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to send this broadcast.')
      }

      setResult(body)
      onSent?.(body)
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const audience = recipients === null
    ? 'Counting dealers…'
    : `${recipients} verified, active ${recipients === 1 ? 'dealer' : 'dealers'}`
  const submitState = broadcastSubmitState({
    hasFile: Boolean(file),
    sending,
    recipients,
    storage,
  })

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal broadcast-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="broadcast-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="broadcast-title">
            <Megaphone aria-hidden="true" /> Send to all dealers
          </h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        {result ? (
          <div className="broadcast-result" role="status">
            <strong>Sent to {result.sent} {result.sent === 1 ? 'dealer' : 'dealers'}.</strong>
            <p>Each one now has a new chat carrying the file. Replies arrive in the inbox.</p>
            <div className="modal-actions">
              <button className="button button--primary" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="broadcast-form" onSubmit={send}>
            <p className="broadcast-audience">
              <Users aria-hidden="true" />
              <span>Goes to <strong>{audience}</strong>, one chat each.</span>
            </p>

            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              tabIndex={-1}
              onChange={pickFile}
            />

            {file ? (
              <div className="broadcast-file">
                {isImageAttachment(file.type) ? (
                  <img src={URL.createObjectURL(file)} alt="" />
                ) : (
                  <span className="broadcast-file-icon"><Paperclip aria-hidden="true" /></span>
                )}
                <span className="broadcast-file-copy">
                  <strong>{file.name}</strong>
                  <small>{formatBytes(file.size)}{file.type ? ` · ${file.type}` : ''}</small>
                </span>
                <button type="button" aria-label="Remove file" onClick={() => setFile(null)}>
                  <CircleX aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                className="broadcast-drop"
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip aria-hidden="true" />
                <strong>Choose a file or image</strong>
                <small>Any format. Up to 10 MB.</small>
              </button>
            )}

            <label className="broadcast-message">
              <span>Message (optional)</span>
              <textarea
                rows={3}
                value={message}
                placeholder="Add a note to go with the file..."
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            {!storage && (
              <p className="broadcast-warning" role="alert">
                Attachment storage is not configured on this environment, so a broadcast
                cannot be sent yet.
              </p>
            )}

            {error && <p className="broadcast-warning" role="alert">{error}</p>}

            <div className="modal-actions">
              <button className="button" type="button" onClick={onClose}>Cancel</button>
              <button
                className="button button--primary"
                type="submit"
                disabled={submitState.disabled}
              >
                <Send aria-hidden="true" />
                {submitState.label}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
