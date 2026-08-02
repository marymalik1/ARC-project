import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../../../lib/permissions'
import { requirePermission } from '../../../../../lib/require-permission'
import { addTicketMessage } from '../../../../../lib/ticket-repository'
import { mapMessageRow, validateMessage } from '../../../../../lib/tickets'

export const runtime = 'nodejs'

export async function POST(request, context) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const { id } = await context.params
    const body = await request.json()
    const validation = validateMessage(body?.body)

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const message = await addTicketMessage(id, validation.value)

    if (!message) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    return NextResponse.json({ message: mapMessageRow(message) }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Unable to send this message.' },
      { status: 500 },
    )
  }
}
