import { hashPassword, verifyPassword } from './password'
import { getPool, hasDatabase } from './database'
import { MIN_PASSWORD_LENGTH } from './dealers'
import { USER_ROLES, roleLabels } from './permissions'

const DEFAULT_AVATAR = '/assets/maryam-avatar.png'

// password_hash is absent on purpose — this is the shape that reaches the client.
const userColumns = 'id, name, email, role, status, avatar_url, created_at'

// Mirrors the seeded row so the app still signs in without a database, the same
// way the dealer repository falls back to in-memory rows.
const fallbackUser = Object.freeze({
  id: 1,
  name: 'Maryam',
  email: 'admin@arcfarm.com',
  password_hash:
    'scrypt$b58ef4f01d65f35f754e5273ec2274a5$d8c323a5aaf6091d44d38d796dc83e0f74a261c997d289a52103181f26d054269b2d602327ec3b0ab59a87ea69e8a167461ab6215ff1cfb7ec4315fb753a7f13',
  role: 'MASTER_ADMIN',
  status: 'Active',
  avatar_url: DEFAULT_AVATAR,
})

export function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roleLabel: roleLabels[row.role] ?? row.role,
    status: row.status,
    avatar: row.avatar_url || DEFAULT_AVATAR,
  }
}

export async function findUserById(id) {
  const numeric = Number(id)

  if (!Number.isFinite(numeric)) {
    return null
  }

  if (!hasDatabase()) {
    return numeric === fallbackUser.id ? mapUserRow(fallbackUser) : null
  }

  const result = await getPool().query(
    `select ${userColumns} from public.users where id = $1 and status = 'Active'`,
    [numeric],
  )

  return result.rowCount ? mapUserRow(result.rows[0]) : null
}

/**
 * Verifies an email/password pair and returns the user, or null. Always runs the
 * password comparison — including for an unknown email, against the fallback
 * hash — so a missing account and a wrong password take the same time and cannot
 * be told apart by timing.
 */
export async function authenticateUser(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null
  }

  const normalized = email.trim().toLowerCase()
  let row

  if (!hasDatabase()) {
    row = normalized === fallbackUser.email ? fallbackUser : null
  } else {
    const result = await getPool().query(
      `select ${userColumns}, password_hash
       from public.users
       where lower(email) = $1 and status = 'Active'`,
      [normalized],
    )
    row = result.rowCount ? result.rows[0] : null
  }

  const matches = await verifyPassword(password, row?.password_hash ?? fallbackUser.password_hash)

  return row && matches ? mapUserRow(row) : null
}

const validStatuses = new Set(['Active', 'Inactive'])

export function validateUser(input, { requirePassword = false } = {}) {
  const value = {
    name: String(input?.name ?? '').trim(),
    email: String(input?.email ?? '').trim().toLowerCase(),
    role: String(input?.role ?? '').trim(),
    status: String(input?.status ?? 'Active').trim(),
    password: String(input?.password ?? ''),
  }

  if (!value.name) {
    return { ok: false, error: 'Name is required.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

  if (!USER_ROLES.includes(value.role)) {
    return { ok: false, error: 'Select a valid role.' }
  }

  if (!validStatuses.has(value.status)) {
    return { ok: false, error: 'Status must be Active or Inactive.' }
  }

  if (requirePassword && !value.password) {
    return { ok: false, error: 'A password is required for a new teammate.' }
  }

  // Blank on edit means "leave the current password alone".
  if (value.password && value.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }

  return { ok: true, value }
}

export async function listUsers() {
  if (!hasDatabase()) {
    return [mapUserRow(fallbackUser)]
  }

  const result = await getPool().query(
    `select ${userColumns} from public.users order by name asc`,
  )

  return result.rows.map(mapUserRow)
}

export async function createUser(user) {
  const passwordHash = await hashPassword(user.password)

  if (!hasDatabase()) {
    const error = new Error('Managing teammates requires a database connection.')
    error.code = 'NO_DATABASE'
    throw error
  }

  const result = await getPool().query(`
    insert into public.users (name, email, password_hash, role, status)
    values ($1, $2, $3, $4, $5)
    returning ${userColumns}
  `, [user.name, user.email, passwordHash, user.role, user.status])

  return mapUserRow(result.rows[0])
}

export async function updateUser(id, user) {
  const passwordHash = user.password ? await hashPassword(user.password) : null

  if (!hasDatabase()) {
    const error = new Error('Managing teammates requires a database connection.')
    error.code = 'NO_DATABASE'
    throw error
  }

  const result = await getPool().query(`
    update public.users
    set name = $2,
        email = $3,
        role = $4,
        status = $5,
        password_hash = coalesce($6, password_hash),
        updated_at = now()
    where id = $1
    returning ${userColumns}
  `, [id, user.name, user.email, user.role, user.status, passwordHash])

  return result.rowCount ? mapUserRow(result.rows[0]) : null
}

export async function deleteUser(id) {
  if (!hasDatabase()) {
    return false
  }

  const result = await getPool().query('delete from public.users where id = $1', [id])
  return result.rowCount > 0
}

/**
 * True when the change would leave nobody able to administer the system —
 * demoting, deactivating or deleting the last active Master Administrator.
 * Without this an admin can lock everyone out and the only way back is SQL.
 */
export async function wouldOrphanAdmins(id, { role, status } = {}) {
  const staysAdmin = role === 'MASTER_ADMIN' && status === 'Active'

  if (staysAdmin) {
    return false
  }

  if (!hasDatabase()) {
    return true
  }

  const result = await getPool().query(
    `select count(*)::int as total
     from public.users
     where role = 'MASTER_ADMIN' and status = 'Active' and id <> $1`,
    [id],
  )

  return (result.rows[0]?.total ?? 0) === 0
}
