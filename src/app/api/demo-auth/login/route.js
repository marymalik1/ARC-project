import { NextResponse } from 'next/server'

import {
  SESSION_COOKIE,
  SESSION_VALUE,
  demoCookieOptions,
  validateDemoCredentials,
} from '../../../../lib/demo-auth'

export async function POST(request) {
  try {
    const form = await request.formData()
    const email = form.get('email')
    const password = form.get('password')

    if (!validateDemoCredentials(email, password)) {
      return NextResponse.redirect(new URL('/login?error=invalid', request.url), {
        status: 303,
      })
    }

    const response = NextResponse.redirect(new URL('/', request.url), {
      status: 303,
    })
    response.cookies.set(SESSION_COOKIE, SESSION_VALUE, demoCookieOptions())
    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=unavailable', request.url), {
      status: 303,
    })
  }
}
