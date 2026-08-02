import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../../../lib/permissions'
import { requirePermission } from '../../../../../lib/require-permission'
import { toggleTicketTag } from '../../../../../lib/ticket-repository'

export const runtime = 'nodejs'

export async function POST(request, context) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const { id } = await context.params
    const body = await request.json()
    const tag = String(body?.tag ?? '').trim()

    if (!tag) {
      return NextResponse.json({ error: 'A tag is required.' }, { status: 400 })
    }

    const tags = await toggleTicketTag(id, tag)

    if (!tags) {
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    return NextResponse.json({ tags })
  } catch (error) {
    const unsupported = error.message?.startsWith('Unsupported tag')

    return NextResponse.json(
      { error: unsupported ? error.message : 'Unable to update these tags.' },
      { status: unsupported ? 400 : 500 },
    )
  }
}
