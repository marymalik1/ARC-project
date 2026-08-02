import { NextResponse } from 'next/server'

import { SESSION_COOKIE, readSessionToken } from './lib/session'

// Runs on the Edge runtime, so it only verifies the token's signature and expiry
// — it cannot reach the database. Whether the user still exists and is active is
// settled by getCurrentUser() on the Node side.
export async function proxy(request) {
  const { pathname } = request.nextUrl
  const claims = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  const authenticated = Boolean(claims)

  if (pathname === '/login') {
    return authenticated
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  }

  return authenticated
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/', '/customer-care/:path*', '/team/:path*', '/login'],
}
