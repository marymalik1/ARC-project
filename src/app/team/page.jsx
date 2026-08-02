import { redirect } from 'next/navigation'
import TeamManagement from '../../components/TeamManagement'
import { getCurrentUser } from '../../lib/current-user'
import { CAPABILITIES, can, landingPathFor } from '../../lib/permissions'
import { listUsers } from '../../lib/users'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Team — FMC Partner',
  description: 'Staff accounts and role assignment',
}

export default async function TeamPage() {
  const user = await getCurrentUser()

  if (!can(user, CAPABILITIES.ADMIN)) {
    redirect(landingPathFor(user))
  }

  let users = []

  try {
    users = await listUsers()
  } catch {
    // The client re-reads on mount, so a cold database still renders the shell.
  }

  return <TeamManagement initialUsers={users} user={user} />
}
