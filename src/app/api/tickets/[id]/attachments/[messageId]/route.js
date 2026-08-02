import { NextResponse } from 'next/server'
import { isImageAttachment } from '../../../../../../lib/attachments'
import { CAPABILITIES } from '../../../../../../lib/permissions'
import { requirePermission } from '../../../../../../lib/require-permission'
import { downloadAttachment } from '../../../../../../lib/storage'
import { getMessageAttachment } from '../../../../../../lib/ticket-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Serves one message's attachment.
 *
 * The bucket is private and this is the only way in: the file is streamed back
 * through here so the session check happens on every single fetch, rather than
 * handing the browser a link that outlives the reader's access.
 */
export async function GET(request, context) {
  try {
    const { response: denied } = await requirePermission(CAPABILITIES.CARE_VIEW)

    if (denied) {
      return denied
    }

    const { id, messageId } = await context.params
    const attachment = await getMessageAttachment(id, messageId)

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
    }

    const body = await downloadAttachment(attachment.attachment_path)

    if (!body) {
      return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })
    }

    const type = attachment.attachment_type || 'application/octet-stream'

    return new NextResponse(body, {
      headers: {
        'Content-Type': type,
        // Images render in the thread; everything else downloads under its
        // original name rather than opening in the tab.
        'Content-Disposition': `${isImageAttachment(type) ? 'inline' : 'attachment'}; filename="${
          encodeURIComponent(attachment.attachment_name ?? 'file')
        }"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Attachment read failed:', error)

    return NextResponse.json(
      { error: 'Unable to open this attachment.' },
      { status: 500 },
    )
  }
}
