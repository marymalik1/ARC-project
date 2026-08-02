import { NextResponse } from 'next/server'
import { attachmentPath, validateBroadcastFile } from '../../../lib/attachments'
import { CAPABILITIES } from '../../../lib/permissions'
import { requirePermission } from '../../../lib/require-permission'
import { hasStorage, removeAttachment, uploadAttachment } from '../../../lib/storage'
import { broadcastToDealers, listBroadcastRecipients } from '../../../lib/ticket-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Recipient count, so the modal can say who this is about to reach. */
export async function GET() {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const recipients = await listBroadcastRecipients()

    return NextResponse.json(
      { recipients: recipients.length, storage: hasStorage() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Unable to count recipients.' }, { status: 500 })
  }
}

/**
 * Sends one file to every verified, active dealer.
 *
 * The file is uploaded once and every delivered chat points at that one object,
 * so a broadcast costs one upload regardless of how many dealers receive it.
 */
export async function POST(request) {
  let storedPath = null

  try {
    const { user: agent, response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const form = await request.formData()
    const file = form.get('file')
    const message = String(form.get('message') ?? '').trim()
    const subject = String(form.get('subject') ?? '').trim()

    const validation = validateBroadcastFile(
      file && typeof file === 'object' && 'size' in file ? file : null,
    )

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    if (!hasStorage()) {
      return NextResponse.json(
        { error: 'Attachments are not configured on this environment.' },
        { status: 503 },
      )
    }

    const recipients = await listBroadcastRecipients()

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'There are no verified, active dealers to send to.' },
        { status: 409 },
      )
    }

    storedPath = await uploadAttachment(
      attachmentPath('broadcasts', file.name),
      file,
      // Unknown formats are stored as bytes rather than refused.
      file.type || 'application/octet-stream',
    )

    const result = await broadcastToDealers({
      subject: subject || `Broadcast · ${file.name}`,
      message,
      attachment: {
        path: storedPath,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      },
    }, agent.name)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Nothing was delivered — the send is one transaction — so the uploaded
    // object has nothing pointing at it and should not stay in the bucket.
    if (storedPath) {
      await removeAttachment(storedPath).catch(() => {})
    }

    console.error('Broadcast failed:', error)

    return NextResponse.json({ error: 'Unable to send this broadcast.' }, { status: 500 })
  }
}
