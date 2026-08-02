import { NextResponse } from 'next/server'
import { CAPABILITIES } from '../../../../lib/permissions'
import { requirePermission } from '../../../../lib/require-permission'
import { deleteUser, updateUser, validateUser, wouldOrphanAdmins } from '../../../../lib/users'

export const runtime = 'nodejs'

export async function PUT(request, context) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.ADMIN)

    if (denied) {
      return denied
    }

    const { id } = await context.params
    const validation = validateUser(await request.json())

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (await wouldOrphanAdmins(id, validation.value)) {
      return NextResponse.json(
        { error: 'This is the last active Master Administrator — change another account first.' },
        { status: 409 },
      )
    }

    const user = await updateUser(id, validation.value)

    if (!user) {
      return NextResponse.json({ error: 'Teammate not found.' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500
    const message = status === 409
      ? 'A teammate with this email already exists.'
      : 'Unable to update this teammate.'

    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request, context) {
  try {
    const { user: actor, response: denied } = await requirePermission(CAPABILITIES.ADMIN)

    if (denied) {
      return denied
    }

    const { id } = await context.params

    if (String(actor.id) === String(id)) {
      return NextResponse.json(
        { error: 'You cannot delete the account you are signed in with.' },
        { status: 409 },
      )
    }

    if (await wouldOrphanAdmins(id)) {
      return NextResponse.json(
        { error: 'This is the last active Master Administrator — promote someone else first.' },
        { status: 409 },
      )
    }

    const deleted = await deleteUser(id)

    if (!deleted) {
      return NextResponse.json({ error: 'Teammate not found.' }, { status: 404 })
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete this teammate.' }, { status: 500 })
  }
}
