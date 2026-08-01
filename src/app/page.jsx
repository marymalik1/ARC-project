import UserManagement from '../components/UserManagement'
import { emptyDealersView, getDealersView } from '../lib/dealer-repository'
import { getPendingTicketCount } from '../lib/ticket-repository'

export const dynamic = 'force-dynamic'

export default async function Page() {
  let initialView

  try {
    const [view, notifications] = await Promise.all([
      getDealersView(),
      getPendingTicketCount(),
    ])
    initialView = { ...view, notifications }
  } catch {
    // The client re-reads on mount and on every poll, so a cold database still
    // renders the shell instead of an error page.
    initialView = { ...emptyDealersView(), notifications: 0 }
  }

  return <UserManagement initialView={initialView} />
}
