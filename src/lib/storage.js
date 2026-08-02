// Supabase Storage, over its REST API.
//
// Deliberately not the supabase-js client: this needs two calls, and a fetch
// against the documented endpoints keeps the dependency list — and the serverless
// bundle — as it is.
//
// The bucket is private. Nothing here ever mints a public or signed URL: files
// are served back through /api/tickets/[id]/attachments/[messageId], which checks
// the caller's session first. An expiring link handed to the browser would also
// have to be re-minted on every poll.

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'support-attachments'

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  return url && key ? { url, key } : null
}

/** Whether attachments can be stored at all. Off in dev until it is configured. */
export function hasStorage() {
  return config() !== null
}

function headers(key, extra = {}) {
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra }
}

export async function uploadAttachment(path, body, contentType) {
  const settings = config()

  if (!settings) {
    throw new Error('Attachment storage is not configured.')
  }

  const response = await fetch(
    `${settings.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`,
    {
      method: 'POST',
      headers: headers(settings.key, {
        'Content-Type': contentType || 'application/octet-stream',
        // Never let one upload land on top of another.
        'x-upsert': 'false',
      }),
      body,
    },
  )

  if (!response.ok) {
    const detail = await response.text()

    // A missing bucket is the one failure an operator can fix in a minute, so it
    // says so rather than reading as a generic upload error.
    if (response.status === 404) {
      throw new Error(
        `Storage bucket "${BUCKET}" does not exist. Create it (private) in Supabase → Storage.`,
      )
    }

    throw new Error(`Attachment upload failed (${response.status}): ${detail}`)
  }

  return path
}

/** Streams an object back. The caller has already checked who is asking. */
export async function downloadAttachment(path) {
  const settings = config()

  if (!settings) {
    throw new Error('Attachment storage is not configured.')
  }

  const response = await fetch(
    `${settings.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`,
    { headers: headers(settings.key) },
  )

  if (!response.ok) {
    return null
  }

  return response.body
}

export async function removeAttachment(path) {
  const settings = config()

  if (!settings) {
    return
  }

  await fetch(`${settings.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: 'DELETE',
    headers: headers(settings.key),
  })
}
