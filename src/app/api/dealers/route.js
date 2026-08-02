import { NextResponse } from 'next/server'
import {
  createDealer,
  getDealersView,
} from '../../../lib/dealer-repository'
import { validateDealer } from '../../../lib/dealers'
import { CAPABILITIES } from '../../../lib/permissions'
import { requirePermission } from '../../../lib/require-permission'
import { getPendingTicketCount } from '../../../lib/ticket-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function viewFromSearchParams(searchParams) {
  return {
    filters: {
      code: searchParams.get('code') ?? '',
      name: searchParams.get('name') ?? '',
      region: searchParams.get('region') ?? '',
      zone: searchParams.get('zone') ?? '',
      territory: searchParams.get('territory') ?? '',
      status: searchParams.get('status') ?? '',
      verification: searchParams.get('verification') ?? '',
      query: searchParams.get('q') ?? '',
    },
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  }
}

export async function GET(request) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.USERS_VIEW)

    if (denied) {
      return denied
    }

    const { searchParams } = new URL(request.url)
    const [view, notifications] = await Promise.all([
      getDealersView(viewFromSearchParams(searchParams)),
      getPendingTicketCount(),
    ])

    return NextResponse.json({ ...view, notifications }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load dealer accounts.' },
      { status: 500 },
    )
  }
}

export async function POST(request) {
  try {
    const { user: actor, response: denied } = await requirePermission(CAPABILITIES.USERS_MANAGE)

    if (denied) {
      return denied
    }

    const validation = validateDealer(await request.json())

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      )
    }

    const dealer = await createDealer(validation.value, actor.name)
    return NextResponse.json({ dealer }, { status: 201 })
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500
    const message = status === 409
      ? 'A dealer with this code already exists.'
      : 'Unable to create this dealer account.'

    return NextResponse.json({ error: message }, { status })
  }
}
