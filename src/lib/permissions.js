// Role-based access control for the modules in the FMC Partners spec.
//
// Imports nothing, so the Sidebar can gate navigation with the same table the
// API routes enforce with. Hiding a button is a convenience; the server check is
// what actually protects the data.

// Roles live here rather than in users.js because the staff form needs them in
// the browser, and users.js pulls in pg and node:crypto.
export const USER_ROLES = Object.freeze([
  'MASTER_ADMIN',
  'ACCOUNTS',
  'SALES',
  'CUSTOMER_SUPPORT',
  'MANAGEMENT',
])

export const roleLabels = Object.freeze({
  MASTER_ADMIN: 'Master Administrator',
  ACCOUNTS: 'Accounts',
  SALES: 'Sales',
  CUSTOMER_SUPPORT: 'Customer Support',
  MANAGEMENT: 'Management',
})

export const CAPABILITIES = Object.freeze({
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  USERS_EXPORT: 'users.export',
  CARE_VIEW: 'care.view',
  CARE_MANAGE: 'care.manage',
  ADMIN: 'admin',
})

const {
  USERS_VIEW, USERS_MANAGE, USERS_EXPORT, CARE_VIEW, CARE_MANAGE, ADMIN,
} = CAPABILITIES

const rolePermissions = Object.freeze({
  MASTER_ADMIN: [USERS_VIEW, USERS_MANAGE, USERS_EXPORT, CARE_VIEW, CARE_MANAGE, ADMIN],
  ACCOUNTS: [USERS_VIEW, USERS_EXPORT],
  SALES: [USERS_VIEW, USERS_EXPORT],
  CUSTOMER_SUPPORT: [CARE_VIEW, CARE_MANAGE],
  // Read-only across both modules: it can see and extract, but never write.
  MANAGEMENT: [USERS_VIEW, USERS_EXPORT, CARE_VIEW],
})

export function permissionsFor(role) {
  return rolePermissions[role] ?? []
}

export function can(user, capability) {
  return permissionsFor(user?.role).includes(capability)
}

/**
 * Where to send someone who lands on a module they cannot open. Customer Support
 * has no User Management access, so "/" is not a safe default for everyone.
 */
export function landingPathFor(user) {
  if (can(user, USERS_VIEW)) return '/'
  if (can(user, CARE_VIEW)) return '/customer-care'

  // No module at all — signing out beats an endless redirect between two pages
  // the account may not open.
  return '/login'
}
