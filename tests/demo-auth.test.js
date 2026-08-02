import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDemoRedirectUrl } from '../src/lib/demo-auth.js'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  readSessionToken,
  sessionCookieOptions,
} from '../src/lib/session.js'

test('round-trips a signed session token', async () => {
  const token = await createSessionToken(42)
  const claims = await readSessionToken(token)

  assert.equal(claims.userId, 42)
  assert.ok(claims.expiresAt > Date.now())
})

test('rejects tampered, malformed and expired tokens', async () => {
  const token = await createSessionToken(42)
  const [userId, expiresAt, signature] = token.split('.')

  // Someone editing the user id in the cookie must not become another user.
  assert.equal(await readSessionToken(`99.${expiresAt}.${signature}`), null)
  // Nor may they extend their own session.
  assert.equal(await readSessionToken(`${userId}.${Date.now() + 10_000_000}.${signature}`), null)

  assert.equal(await readSessionToken('not-a-token'), null)
  assert.equal(await readSessionToken(''), null)
  assert.equal(await readSessionToken(undefined), null)
  assert.equal(await readSessionToken('1.2.3.4'), null)
  assert.equal(await readSessionToken(`${userId}.${expiresAt}.!!!not-base64!!!`), null)

  const expired = await createSessionToken(42, -60)
  assert.equal(await readSessionToken(expired), null)
})

test('uses constrained cookie options', () => {
  const options = sessionCookieOptions()

  assert.equal(SESSION_COOKIE, 'arc_demo_session')
  assert.equal(options.httpOnly, true)
  assert.equal(options.sameSite, 'lax')
  assert.equal(options.path, '/')
  assert.equal(options.maxAge, SESSION_TTL_SECONDS)
})

test('builds redirects from the incoming public host', () => {
  const request = new globalThis.Request('http://localhost:3000/api/demo-auth/login', {
    headers: {
      host: '127.0.0.1:3000',
      'x-forwarded-proto': 'http',
    },
  })

  assert.equal(buildDemoRedirectUrl(request, '/'), 'http://127.0.0.1:3000/')
})
