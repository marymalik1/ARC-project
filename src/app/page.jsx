import UserManagement from '../components/UserManagement'
import { listDealers } from '../lib/dealer-repository'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const dealers = await listDealers()

  return <UserManagement initialDealers={dealers} />
}
