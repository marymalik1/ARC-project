import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../lib/permissions'
import { requirePermission } from '../../../lib/require-permission'
import { createDealerChat, getTicketsView } from '../../../lib/ticket-repository'
import { validateNewChat } from '../../../lib/tickets'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function ticketViewFromSearchParams(searchParams) {
  return {
    filters: {
      dealerCode: searchParams.get('dealerCode') ?? '',
      dealerName: searchParams.get('dealerName') ?? '',
      region: searchParams.get('region') ?? '',
      zone: searchParams.get('zone') ?? '',
      territory: searchParams.get('territory') ?? '',
      chatType: searchParams.get('chatType') ?? '',
      fromDate: searchParams.get('fromDate') ?? '',
      toDate: searchParams.get('toDate') ?? '',
      tab: searchParams.get('tab') ?? '',
      query: searchParams.get('query') ?? '',
    },
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  }
}

export async function GET(request) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_VIEW)

    if (denied) {
      return denied
    }

    const { searchParams } = new URL(request.url)
    const view = await getTicketsView(ticketViewFromSearchParams(searchParams))

    return NextResponse.json(view, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load support chats.' },
      { status: 500 },
    )
  }
}

/** Opens a new conversation with a dealer who already has one. */
export async function POST(request) {
  try {
    const { user: agent, response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const validation = validateNewChat(await request.json())

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const result = await createDealerChat(validation.value, agent.name)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ ticket: result.ticket }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unable to start this chat.' }, { status: 500 })
  }
}
