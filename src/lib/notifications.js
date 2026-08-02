// Shapes the header bell feed.
//
// Imports nothing from the database layer, so the browser component and the API
// route that feeds it agree on ids, copy and ordering without pulling `pg` into
// the client bundle.

/** How many items the bell keeps. Older work still lives on the module pages. */
export const NOTIFICATION_LIMIT = 8

// The support desk reports in Pakistan Standard Time, same as the inbox.
const DISPLAY_TIME_ZONE = 'Asia/Karachi'

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
})

/** A pending support chat nobody has answered yet. */
export function ticketNotification(notice) {
  return {
    id: `ticket:${notice.id}`,
    kind: 'support',
    title: notice.customerName
      ? `New support chat from ${notice.customerName}`
      : 'New support chat',
    body: notice.subject,
    href: '/customer-care',
    at: notice.createdAt,
  }
}

/** A self-registration from the dealer app, still waiting on verification. */
export function registrationNotification(notice) {
  return {
    id: `dealer:${notice.code}`,
    kind: 'registration',
    title: 'Dealer awaiting verification',
    body: `${notice.name} (${notice.code}) registered and needs review.`,
    href: '/',
    at: notice.createdAt,
  }
}

/** Merges the per-source lists into one newest-first feed. */
export function mergeNotifications(groups, limit = NOTIFICATION_LIMIT) {
  return groups
    .flat()
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}

export function emptyNotificationsView() {
  return { notifications: [], syncedAt: new Date().toISOString() }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Age label for a feed row. Anything older than a week reads as a date — "8d
 * ago" stops being useful long before it stops being accurate.
 */
export function relativeTime(value, reference = new Date()) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  // A clock a little ahead of ours should not read as "in the future".
  const elapsed = Math.max(0, reference.getTime() - date.getTime())

  if (elapsed < MINUTE) return 'Just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`

  return dayFormat.format(date)
}
