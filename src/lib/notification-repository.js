import { listUnverifiedDealerNotices } from './dealer-repository'
import {
  NOTIFICATION_LIMIT,
  mergeNotifications,
  registrationNotification,
  ticketNotification,
} from './notifications'
import { CAPABILITIES, can } from './permissions'
import { listPendingTicketNotices } from './ticket-repository'

/**
 * The header bell feed for one reader.
 *
 * Every row comes from work the modules already track — support chats still
 * pending, dealer accounts still unverified — gated by the same capabilities
 * that gate the pages themselves, so the bell never announces something the
 * reader would be refused when they clicked it.
 */
export async function getNotificationsView(user, limit = NOTIFICATION_LIMIT) {
  const [tickets, registrations] = await Promise.all([
    can(user, CAPABILITIES.CARE_VIEW) ? listPendingTicketNotices(limit) : [],
    can(user, CAPABILITIES.USERS_VIEW) ? listUnverifiedDealerNotices(limit) : [],
  ])

  return {
    notifications: mergeNotifications(
      [tickets.map(ticketNotification), registrations.map(registrationNotification)],
      limit,
    ),
    syncedAt: new Date().toISOString(),
  }
}
