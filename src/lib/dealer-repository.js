import pg from 'pg'
import { initialDealers } from '../data/dealers'
import { mapDealerRow } from './dealers'

const { Pool } = pg
const globalDatabase = globalThis

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL)
}

function getPool() {
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

function getMemoryDealers() {
  if (!globalDatabase.arcMemoryDealers) {
    globalDatabase.arcMemoryDealers = initialDealers.map((dealer) => ({ ...dealer }))
  }

  return globalDatabase.arcMemoryDealers
}

export async function listDealers() {
  if (!hasDatabase()) {
    return getMemoryDealers().map((dealer) => ({ ...dealer }))
  }

  const result = await getPool().query(`
    select code, name, region, zone, territory, status, created_on
    from public.dealers
    order by code asc
    limit 250
  `)

  return result.rows.map(mapDealerRow)
}

export async function createDealer(dealer) {
  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()

    if (memoryDealers.some((item) => item.code === dealer.code)) {
      const error = new Error('A dealer with this code already exists.')
      error.code = '23505'
      throw error
    }

    const created = {
      ...dealer,
      createdOn: new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    }
    memoryDealers.unshift(created)
    return { ...created }
  }

  const result = await getPool().query(`
    insert into public.dealers (code, name, region, zone, territory, status)
    values ($1, $2, $3, $4, $5, $6)
    returning code, name, region, zone, territory, status, created_on
  `, [
    dealer.code,
    dealer.name,
    dealer.region,
    dealer.zone,
    dealer.territory,
    dealer.status,
  ])

  return mapDealerRow(result.rows[0])
}

export async function updateDealer(code, dealer) {
  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()
    const index = memoryDealers.findIndex((item) => item.code === code)

    if (index === -1) {
      return null
    }

    memoryDealers[index] = {
      ...memoryDealers[index],
      ...dealer,
      code,
    }
    return { ...memoryDealers[index] }
  }

  const result = await getPool().query(`
    update public.dealers
    set name = $2,
        region = $3,
        zone = $4,
        territory = $5,
        status = $6,
        updated_at = now()
    where code = $1
    returning code, name, region, zone, territory, status, created_on
  `, [
    code,
    dealer.name,
    dealer.region,
    dealer.zone,
    dealer.territory,
    dealer.status,
  ])

  return result.rowCount ? mapDealerRow(result.rows[0]) : null
}

export async function deleteDealer(code) {
  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()
    const index = memoryDealers.findIndex((item) => item.code === code)

    if (index === -1) {
      return false
    }

    memoryDealers.splice(index, 1)
    return true
  }

  const result = await getPool().query(
    'delete from public.dealers where code = $1',
    [code],
  )

  return result.rowCount > 0
}
