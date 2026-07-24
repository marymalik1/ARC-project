import { NextResponse } from 'next/server'
import {
  deleteDealer,
  updateDealer,
} from '../../../../lib/dealer-repository'
import { validateDealer } from '../../../../lib/dealers'

export const runtime = 'nodejs'

export async function PUT(request, context) {
  try {
    const { code } = await context.params
    const validation = validateDealer({
      ...await request.json(),
      code,
    })

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      )
    }

    const dealer = await updateDealer(code, validation.value)

    if (!dealer) {
      return NextResponse.json(
        { error: 'Dealer account not found.' },
        { status: 404 },
      )
    }

    return NextResponse.json({ dealer })
  } catch {
    return NextResponse.json(
      { error: 'Unable to update this dealer account.' },
      { status: 500 },
    )
  }
}

export async function DELETE(_request, context) {
  try {
    const { code } = await context.params
    const deleted = await deleteDealer(code)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Dealer account not found.' },
        { status: 404 },
      )
    }

    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json(
      { error: 'Unable to delete this dealer account.' },
      { status: 500 },
    )
  }
}
