import { NextResponse } from 'next/server'

import { buildDemoRedirectUrl } from '../../../../lib/demo-auth'
import { SESSION_COOKIE, sessionCookieOptions } from '../../../../lib/session'

export async function POST(request) {
  const response = NextResponse.redirect(buildDemoRedirectUrl(request, '/login'), {
    status: 303,
  })
  response.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  })
  return response
}
