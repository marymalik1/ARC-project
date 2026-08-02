import { redirect } from 'next/navigation'
import UserManagement from '../components/UserManagement'
import { getCurrentUser } from '../lib/current-user'
import { emptyDealersView, getDealersView } from '../lib/dealer-repository'
import { CAPABILITIES, can, landingPathFor } from '../lib/permissions'
import { getPendingTicketCount } from '../lib/ticket-repository'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()

  // Customer Support has no User Management access, so send it somewhere it can
  // actually work instead of rendering a shell it may not read.
  if (!can(user, CAPABILITIES.USERS_VIEW)) {
    redirect(landingPathFor(user))
  }

  let initialView

  try {
    // The bell itself is permission-scoped, so the count rendered before it
    // fetches must be too — a reader with no care access is told nothing here.
    const [view, notifications] = await Promise.all([
      getDealersView(),
      can(user, CAPABILITIES.CARE_VIEW) ? getPendingTicketCount() : 0,
    ])
    initialView = { ...view, notifications }
  } catch {
    // The client re-reads on mount and on every poll, so a cold database still
    // renders the shell instead of an error page.
    initialView = { ...emptyDealersView(), notifications: 0 }
  }

  return <UserManagement initialView={initialView} user={user} />
}
