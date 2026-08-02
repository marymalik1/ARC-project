import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../lib/permissions'
import { requirePermission } from '../../../lib/require-permission'
import { getTicketsView } from '../../../lib/ticket-repository'

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
