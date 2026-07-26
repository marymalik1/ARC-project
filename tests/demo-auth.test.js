import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  SESSION_COOKIE,
  SESSION_VALUE,
  buildDemoRedirectUrl,
  demoCookieOptions,
  hasDemoSession,
  validateDemoCredentials,
} from '../src/lib/demo-auth.js'

test('accepts only the documented demo credentials', () => {
  assert.equal(validateDemoCredentials(DEMO_EMAIL, DEMO_PASSWORD), true)
  assert.equal(validateDemoCredentials(` ${DEMO_EMAIL.toUpperCase()} `, DEMO_PASSWORD), true)
  assert.equal(validateDemoCredentials(DEMO_EMAIL, 'wrong-password'), false)
  assert.equal(validateDemoCredentials('other@example.com', DEMO_PASSWORD), false)
})

test('recognizes only the demo session value', () => {
  assert.equal(SESSION_COOKIE, 'arc_demo_session')
  assert.equal(hasDemoSession(SESSION_VALUE), true)
  assert.equal(hasDemoSession('expired'), false)
  assert.equal(hasDemoSession(undefined), false)
})

test('uses constrained cookie options', () => {
  const options = demoCookieOptions()

  assert.equal(options.httpOnly, true)
  assert.equal(options.sameSite, 'lax')
  assert.equal(options.path, '/')
  assert.equal(options.maxAge, 60 * 60 * 8)
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
