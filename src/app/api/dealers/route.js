import { NextResponse } from 'next/server'
import {
  createDealer,
  listDealers,
} from '../../../lib/dealer-repository'
import { validateDealer } from '../../../lib/dealers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const dealers = await listDealers()
    return NextResponse.json({ dealers })
  } catch {
    return NextResponse.json(
      { error: 'Unable to load dealer accounts.' },
      { status: 500 },
    )
  }
}

export async function POST(request) {
  try {
    const validation = validateDealer(await request.json())

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      )
    }

    const dealer = await createDealer(validation.value)
    return NextResponse.json({ dealer }, { status: 201 })
  } catch (error) {
    const status = error.code === '23505' ? 409 : 500
    const message = status === 409
      ? 'A dealer with this code already exists.'
      : 'Unable to create this dealer account.'

    return NextResponse.json({ error: message }, { status })
  }
}
