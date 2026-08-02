import { NextResponse } from 'next/server'
import { createDealer } from '../../../lib/dealer-repository'
import { validateDealer } from '../../../lib/dealers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Self-registration from the dealer mobile application.
 *
 * Deliberately unauthenticated — the dealer has no account yet. Everything it
 * creates lands Inactive and unverified, so a registration grants no access on
 * its own: it only queues a row for an administrator to review in the portal.
 *
 * Fields an applicant must not choose for themselves (status, verification, role)
 * are ignored rather than trusted from the body.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const validation = validateDealer({
      ...body,
      status: 'Inactive',
      verified: false,
      role: 'Dealer',
    })

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const dealer = await createDealer(validation.value, '')

    return NextResponse.json(
      {
        dealer: { code: dealer.code, name: dealer.name, status: dealer.status },
        message: 'Registration received. An administrator will review it shortly.',
      },
      { status: 201 },
    )
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500
    const message = status === 409
      ? 'An account with this dealer code already exists.'
      : 'Unable to submit this registration.'

    return NextResponse.json({ error: message }, { status })
  }
}
