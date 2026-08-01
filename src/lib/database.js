import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const { Pool, types } = pg
const globalDatabase = globalThis

// `date` columns carry no time zone. node-postgres would otherwise parse them
// into a Date at *local* midnight, which shifts the calendar day whenever the
// server runs at a positive UTC offset. Keep them as 'YYYY-MM-DD' text instead.
const DATE_OID = 1082
types.setTypeParser(DATE_OID, (value) => value)

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * Supabase serves its pooler behind a private root CA that Node does not ship,
 * so certificate verification needs that root supplied explicitly. Point
 * `DATABASE_CA_CERT` at the PEM to keep verification on.
 */
function buildSslOptions() {
  if (process.env.DATABASE_SSL === 'false') {
    return false
  }

  const caPath = process.env.DATABASE_CA_CERT

  if (caPath) {
    return {
      ca: readFileSync(path.resolve(process.cwd(), caPath), 'utf8'),
      rejectUnauthorized: true,
    }
  }

  // Encrypted but unverified. Only reachable by opting in, never the default.
  if (process.env.DATABASE_SSL === 'no-verify') {
    return { rejectUnauthorized: false }
  }

  return { rejectUnauthorized: true }
}

/** One pooled connection per process, shared by every repository. */
export function getPool() {
  if (!globalDatabase.arcDatabasePool) {
    globalDatabase.arcDatabasePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: buildSslOptions(),
    })
  }

  return globalDatabase.arcDatabasePool
}
