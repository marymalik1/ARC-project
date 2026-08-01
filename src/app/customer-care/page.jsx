import CustomerCare from '../../components/CustomerCare'
import { emptyTicketsView, getTicketsView } from '../../lib/ticket-repository'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Customer Care — ARC',
  description: 'ARC customer support ticket workspace',
}

export default async function CustomerCarePage() {
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
    />
  )
}
