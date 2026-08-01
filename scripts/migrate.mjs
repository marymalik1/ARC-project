// Applies every file in supabase/migrations in filename order.
// Usage: npm run migrate
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const root = process.cwd()

// Next.js loads .env.local automatically; a standalone script has to do it itself.
for (const file of ['.env.local', '.env']) {
  const envPath = path.join(root, file)

  if (!existsSync(envPath)) {
    continue
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)

    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2]
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local first.')
  process.exit(1)
}

function sslOptions() {
  if (process.env.DATABASE_SSL === 'false') {
    return false
  }

  if (process.env.DATABASE_CA_CERT) {
    return {
      ca: readFileSync(path.resolve(root, process.env.DATABASE_CA_CERT), 'utf8'),
      rejectUnauthorized: true,
    }
  }

  return process.env.DATABASE_SSL === 'no-verify'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true }
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslOptions(),
  connectionTimeoutMillis: 15_000,
})

const directory = path.join(root, 'supabase/migrations')
const files = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()

let failed = false

for (const file of files) {
  process.stdout.write(`applying ${file} ... `)

  try {
    await pool.query(readFileSync(path.join(directory, file), 'utf8'))
    console.log('ok')
  } catch (error) {
    console.log('FAILED')
    console.error(`  ${error.message}`)
    failed = true
    break
  }
}

await pool.end()
process.exit(failed ? 1 : 0)
