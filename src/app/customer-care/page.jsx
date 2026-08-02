import { redirect } from 'next/navigation'
import CustomerCare from '../../components/CustomerCare'
import { getCurrentUser } from '../../lib/current-user'
import { CAPABILITIES, can, landingPathFor } from '../../lib/permissions'
import { emptyTicketsView, getTicketsView } from '../../lib/ticket-repository'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Customer Care — ARC',
  description: 'ARC customer support ticket workspace',
}

export default async function CustomerCarePage() {
  const user = await getCurrentUser()

  if (!can(user, CAPABILITIES.CARE_VIEW)) {
    redirect(landingPathFor(user))
  }

  let initialView

  try {
    initialView = await getTicketsView()
  } catch {
    // The client re-reads on mount and on every poll, so a cold database still
    // renders the workspace instead of an error page.
    initialView = emptyTicketsView()
  }

  return (
    <CustomerCare
      initialView={initialView}
      notifications={initialView.counts.pending}
      user={user}
    />
  )
}
