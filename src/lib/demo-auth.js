export const DEMO_EMAIL = 'admin@arcfarm.com'
export const DEMO_PASSWORD = 'Arc@123'
export const SESSION_COOKIE = 'arc_demo_session'
export const SESSION_VALUE = 'authenticated'

// The account behind the demo session. Replace this with a real user lookup
// once sign-in issues per-user sessions.
export const DEMO_USER = Object.freeze({
  name: 'Maryam',
  email: DEMO_EMAIL,
  avatar: '/assets/maryam-avatar.png',
})

export function validateDemoCredentials(email, password) {
  return (
    typeof email === 'string'
    && typeof password === 'string'
    && email.trim().toLowerCase() === DEMO_EMAIL
    && password === DEMO_PASSWORD
  )
}

export function hasDemoSession(value) {
  return value === SESSION_VALUE
}

export function buildDemoRedirectUrl(request, pathname) {
  const url = new URL(pathname, request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
  const host = forwardedHost || request.headers.get('host')
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()

  if (host) {
    url.host = host
  }

  if (forwardedProtocol === 'http' || forwardedProtocol === 'https') {
    url.protocol = `${forwardedProtocol}:`
  }

  return url.toString()
}

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  }
}
