// Redirect helper shared by the sign-in and sign-out routes. Credentials live in
// users.js and sessions in session.js — this file no longer knows any passwords,
// and imports nothing, so plain Node can load it in tests.

// Rendered on the sign-in page as the sample credentials.
export const DEMO_EMAIL = 'admin@arcfarm.com'
export const DEMO_PASSWORD = 'Arc@123'

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
