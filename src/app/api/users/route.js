import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../lib/permissions'
import { requirePermission } from '../../../lib/require-permission'
import { createUser, listUsers, validateUser } from '../../../lib/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.ADMIN)

    if (denied) {
      return denied
    }

    return NextResponse.json({ users: await listUsers() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Unable to load teammates.' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.ADMIN)

    if (denied) {
      return denied
    }

    const validation = validateUser(await request.json(), { requirePassword: true })

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    return NextResponse.json({ user: await createUser(validation.value) }, { status: 201 })
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500
    const message = status === 409
      ? 'A teammate with this email already exists.'
      : 'Unable to create this teammate.'

    return NextResponse.json({ error: message }, { status })
  }
}
