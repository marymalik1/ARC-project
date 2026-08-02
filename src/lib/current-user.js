import { cookies } from 'next/headers'
import { SESSION_COOKIE, readSessionToken } from './session'
import { findUserById } from './users'

/**
 * The signed-in user for the current request, or null.
 *
 * This is the single place server code answers "who is acting?" — API routes
 * stamp created_by / verified_by from it, and the page shells render the header
 * from it. Node runtime only: it reads the database. proxy.js verifies the token
 * signature alone, which is all the Edge runtime can do.
 */
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const claims = await readSessionToken(token)

  if (!claims) {
    return null
  }

  return findUserById(claims.userId)
}
