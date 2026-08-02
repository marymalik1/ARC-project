import { NextResponse } from 'next/server'
import { getCurrentUser } from './current-user'
import { can } from './permissions'

/**
 * Resolves the caller and checks one capability.
 *
 * Returns `{ user }` when allowed, or `{ response }` carrying the 401/403 the
 * route should return. Hiding a button in the UI is only a convenience — this is
 * the check that actually stops a request.
 */
export async function requirePermission(capability) {
  const user = await getCurrentUser()

  if (!user) {
    return {
      response: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }),
    }
  }

  if (!can(user, capability)) {
    return {
      response: NextResponse.json(
        { error: 'Your role does not allow this action.' },
        { status: 403 },
      ),
    }
  }

  return { user }
}
