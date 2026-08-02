import { NextResponse } from 'next/server'
import { getCurrentUser } from '../../../lib/current-user'
import { getNotificationsView } from '../../../lib/notification-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Feeds the header bell. Scoped to the caller — see getNotificationsView. */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
    }

    const view = await getNotificationsView(user)

    return NextResponse.json(view, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load notifications.' },
      { status: 500 },
    )
  }
}
