// Rules for files attached to a support message.
//
// Imports nothing, so the composer can refuse an oversized file before spending
// the upload, and the API route can refuse the same file again on arrival. The
// browser check is a courtesy; the server one is what actually holds.

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

// Screenshots and paperwork — what a dealer actually sends a support desk. An
// allow-list rather than a deny-list: anything unlisted is refused rather than
// stored and served back to a browser later.
export const ALLOWED_ATTACHMENT_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const allowed = new Set(ALLOWED_ATTACHMENT_TYPES)

export function isImageAttachment(type) {
  return String(type ?? '').startsWith('image/')
}

export function formatBytes(bytes) {
  const size = Number(bytes) || 0

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// A broadcast is a deliberate act by staff rather than something a dealer can
// trigger, so it takes any format at all — the allow-list above exists to stop
// the inbox serving arbitrary uploads back to a browser, and a broadcast file is
// chosen by the sender. The size ceiling still applies: it is copied to every
// recipient's chat.
export const MAX_BROADCAST_BYTES = 50 * 1024 * 1024

export function validateBroadcastFile(file) {
  if (!file || typeof file.size !== 'number') {
    return { ok: false, error: 'Choose a file or image to send.' }
  }

  if (file.size === 0) {
    return { ok: false, error: 'That file is empty.' }
  }

  if (file.size > MAX_BROADCAST_BYTES) {
    return {
      ok: false,
      error: `Broadcasts are limited to ${formatBytes(MAX_BROADCAST_BYTES)}.`,
    }
  }

  return { ok: true, value: file }
}

export function validateAttachment(file) {
  if (!file || typeof file.size !== 'number') {
    return { ok: false, error: 'Select a file to attach.' }
  }

  if (file.size === 0) {
    return { ok: false, error: 'That file is empty.' }
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `Attachments are limited to ${formatBytes(MAX_ATTACHMENT_BYTES)}.`,
    }
  }

  if (!allowed.has(file.type)) {
    return { ok: false, error: 'That file type cannot be attached.' }
  }

  return { ok: true, value: file }
}

/**
 * Object key for the bucket: grouped by chat, prefixed with a random id so two
 * files named "screenshot.png" cannot collide or overwrite each other.
 */
export function attachmentPath(ticketId, fileName) {
  const safeName = String(fileName ?? 'file')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80) || 'file'

  return `${ticketId}/${crypto.randomUUID()}-${safeName}`
}
