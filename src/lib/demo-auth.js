export const DEMO_EMAIL = 'admin@arcfarm.com'
export const DEMO_PASSWORD = 'Arc@123'
export const SESSION_COOKIE = 'arc_demo_session'
export const SESSION_VALUE = 'authenticated'

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

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  }
}
