import { NextResponse } from 'next/server'

import { buildDemoRedirectUrl } from '../../../../lib/demo-auth'
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '../../../../lib/session'
import { authenticateUser } from '../../../../lib/users'

// Reads the database and hashes with node:crypto, so it cannot run on Edge.
export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const form = await request.formData()
    const user = await authenticateUser(form.get('email'), form.get('password'))

    if (!user) {
      return NextResponse.redirect(buildDemoRedirectUrl(request, '/login?error=invalid'), {
        status: 303,
      })
    }

    const response = NextResponse.redirect(buildDemoRedirectUrl(request, '/'), {
      status: 303,
    })
    response.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions())
    return response
  } catch {
    return NextResponse.redirect(buildDemoRedirectUrl(request, '/login?error=unavailable'), {
      status: 303,
    })
  }
}
