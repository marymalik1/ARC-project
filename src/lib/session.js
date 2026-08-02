// Signed session tokens: "<userId>.<expiresAt>.<hmac>".
//
// Deliberately built on Web Crypto rather than node:crypto — proxy.js runs in
// the Edge runtime, so the same verification has to work there and in the Node
// API routes. This module imports nothing else so it stays loadable from both,
// and from plain Node in tests.

const encoder = new TextEncoder()

export const SESSION_COOKIE = 'arc_demo_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8

const DEV_SECRET = 'arc-development-session-secret-not-for-production'

function readSecret() {
  const configured = process.env.SESSION_SECRET

  if (configured) {
    return configured
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production.')
  }

  // A stable development fallback: a random one per boot would sign everyone out
  // on every restart.
  return DEV_SECRET
}

let cachedKey = null
let cachedSecret = null

function getKey() {
  const secret = readSecret()

  if (!cachedKey || cachedSecret !== secret) {
    cachedSecret = secret
    cachedKey = crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    )
  }

  return cachedKey
}

function toBase64Url(buffer) {
  let binary = ''

  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export async function createSessionToken(userId, ttlSeconds = SESSION_TTL_SECONDS) {
  const expiresAt = Date.now() + ttlSeconds * 1000
  const payload = `${userId}.${expiresAt}`
  const signature = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(payload))

  return `${payload}.${toBase64Url(signature)}`
}

/**
 * Returns the session's claims, or null when the token is malformed, has been
 * tampered with, or has expired. Callers treat null as "not signed in".
 */
export async function readSessionToken(token) {
  if (typeof token !== 'string') {
    return null
  }

  const parts = token.split('.')

  if (parts.length !== 3) {
    return null
  }

  const [userId, expiresAt, signature] = parts
  const payload = `${userId}.${expiresAt}`

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(payload),
    )

    if (!valid) {
      return null
    }
  } catch {
    // Malformed base64 in the signature segment.
    return null
  }

  const expiry = Number(expiresAt)

  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    return null
  }

  return { userId: Number(userId), expiresAt: expiry }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}
