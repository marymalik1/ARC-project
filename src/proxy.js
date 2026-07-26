import { NextResponse } from 'next/server'

import { SESSION_COOKIE, hasDemoSession } from './lib/demo-auth'

export function proxy(request) {
  const { pathname } = request.nextUrl
  const authenticated = hasDemoSession(request.cookies.get(SESSION_COOKIE)?.value)

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
  matcher: ['/', '/customer-care/:path*', '/login'],
}
