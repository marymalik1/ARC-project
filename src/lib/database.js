import pg from 'pg'

const { Pool } = pg
const globalDatabase = globalThis

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL)
}

/** One pooled connection per process, shared by every repository. */
export function getPool() {
  if (!globalDatabase.arcDatabasePool) {
    globalDatabase.arcDatabasePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: true },
    })
  }

  return globalDatabase.arcDatabasePool
}
