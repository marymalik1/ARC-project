import { NextResponse } from 'next/server'
import { attachmentPath, validateAttachment } from '../../../../../lib/attachments'
import { CAPABILITIES } from '../../../../../lib/permissions'
import { requirePermission } from '../../../../../lib/require-permission'
import { hasStorage, removeAttachment, uploadAttachment } from '../../../../../lib/storage'
import { addTicketMessage } from '../../../../../lib/ticket-repository'
import { mapMessageRow, validateMessage } from '../../../../../lib/tickets'

export const runtime = 'nodejs'

/**
 * Accepts either JSON (`{ body }`) or multipart when a file rides along, so a
 * plain reply still costs one small request.
 */
async function readSubmission(request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    const json = await request.json()
    return { body: json?.body, file: null }
  }

  const form = await request.formData()
  const file = form.get('file')

  return {
    body: form.get('body'),
    file: file && typeof file === 'object' && 'size' in file ? file : null,
  }
}

export async function POST(request, context) {
  let storedPath = null

  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_MANAGE)

    if (denied) {
      return denied
    }

    const { id } = await context.params
    const { body, file } = await readSubmission(request)

    // With a file attached the words are optional — the file is the message.
    const text = String(body ?? '').trim()
    const validation = file ? { ok: true, value: text } : validateMessage(body)

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    let attachment = null

    if (file) {
      if (!hasStorage()) {
        return NextResponse.json(
          { error: 'Attachments are not configured on this environment.' },
          { status: 503 },
        )
      }

      const fileCheck = validateAttachment(file)

      if (!fileCheck.ok) {
        return NextResponse.json({ error: fileCheck.error }, { status: 400 })
      }

      // The File is handed to fetch as-is rather than read into a Buffer first:
      // it is already a Blob, and buffering it would double the memory a 5 MB
      // upload costs the function.
      storedPath = await uploadAttachment(attachmentPath(id, file.name), file, file.type)
      attachment = { path: storedPath, name: file.name, type: file.type, size: file.size }
    }

    const message = await addTicketMessage(id, validation.value, 'agent', attachment)

    if (!message) {
      // No row to point at the object, so it should not stay in the bucket.
      await removeAttachment(storedPath)
      return NextResponse.json({ error: 'Chat not found.' }, { status: 404 })
    }

    return NextResponse.json({ message: mapMessageRow(message) }, { status: 201 })
  } catch (error) {
    if (storedPath) {
      await removeAttachment(storedPath).catch(() => {})
    }

    console.error('Message send failed:', error)

    return NextResponse.json(
      { error: 'Unable to send this message.' },
      { status: 500 },
    )
  }
}
