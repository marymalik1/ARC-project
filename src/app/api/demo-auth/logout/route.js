import { NextResponse } from 'next/server'

import { SESSION_COOKIE, demoCookieOptions } from '../../../../lib/demo-auth'

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  })
  response.cookies.set(SESSION_COOKIE, '', {
    ...demoCookieOptions(),
    maxAge: 0,
  })
  return response
}
