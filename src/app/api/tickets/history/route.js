import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../../lib/permissions'
import { requirePermission } from '../../../../lib/require-permission'
import { listDealerChatHistory } from '../../../../lib/ticket-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Past conversations for one dealer, independent of the inbox's filters. */
export async function GET(request) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_VIEW)

    if (denied) {
      return denied
    }

    const dealerCode = new URL(request.url).searchParams.get('dealerCode')?.trim().toUpperCase()

    if (!dealerCode) {
      return NextResponse.json({ error: 'A dealer code is required.' }, { status: 400 })
    }

    return NextResponse.json({ chats: await listDealerChatHistory(dealerCode) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load chat history.' }, { status: 500 })
  }
}
