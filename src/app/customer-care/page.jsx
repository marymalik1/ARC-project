import CustomerCare from '../../components/CustomerCare'
import { initialTickets } from '../../data/tickets'

export const metadata = {
  title: 'Customer Care — ARC',
  description: 'ARC customer support ticket workspace',
}

export default function CustomerCarePage() {
  return <CustomerCare initialTickets={initialTickets} />
}
