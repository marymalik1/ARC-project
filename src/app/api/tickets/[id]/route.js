import { NextResponse } from 'next/server'
import { setTicketStatus } from '../../../../lib/ticket-repository'
import { validateTicketStatus } from '../../../../lib/tickets'

export const runtime = 'nodejs'

export async function PATCH(request, context) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const validation = validateTicketStatus(String(body?.status ?? '').trim())

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const ticket = await setTicketStatus(id, validation.value)

    if (!ticket) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    return NextResponse.json({ status: ticket.status })
  } catch {
    return NextResponse.json(
      { error: 'Unable to update this chat.' },
      { status: 500 },
    )
  }
}
