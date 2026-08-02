import { initialDealerRows } from '../data/dealers'
import { getPool, hasDatabase } from './database'
import { NOTIFICATION_LIMIT } from './notifications'
import { hashPassword } from './password'
import {
  ANY_REGION,
  ANY_STATUS,
  ANY_TERRITORY,
  ANY_VERIFICATION,
  ANY_ZONE,
  calculateStats,
  collectFacets,
  emptyFacets,
  emptyFilters,
  emptyStats,
  filterDealers,
  mapDealerRow,
  normalizeFilters,
  normalizePage,
  normalizePageSize,
  paginate,
} from './dealers'

const globalDatabase = globalThis

// password_hash is deliberately absent: every read path returns these columns, so
// leaving it out keeps the hash off the wire entirely.
const dealerColumns = `code, name, region, zone, territory, status, created_on, created_at,
  email, store_code, role, verified, verified_by, verified_at, created_by`

function getMemoryDealers() {
  if (!globalDatabase.arcMemoryDealerRows) {
    globalDatabase.arcMemoryDealerRows = initialDealerRows.map((row) => ({ ...row }))
  }

  return globalDatabase.arcMemoryDealerRows
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Builds the shared `where` clause so the page query, the count and the stats
// all read the same slice of the table.
function buildFilterClause(filters, startIndex = 1) {
  const values = normalizeFilters(filters)
  const conditions = []
  const params = []
  let index = startIndex

  const add = (sql, value) => {
    conditions.push(sql.replace('$$', `$${index}`))
    params.push(value)
    index += 1
  }

  if (values.code) add('code ilike $$', `%${values.code}%`)
  if (values.name) add('name ilike $$', `%${values.name}%`)
  if (values.region !== ANY_REGION) add('region = $$', values.region)
  if (values.zone !== ANY_ZONE) add('zone = $$', values.zone)
  if (values.territory !== ANY_TERRITORY) add('territory = $$', values.territory)
  if (values.status !== ANY_STATUS) add('status = $$', values.status)

  if (values.verification !== ANY_VERIFICATION) {
    conditions.push(values.verification === 'Verified' ? 'verified' : 'not verified')
  }

  if (values.query) {
    conditions.push(`(code ilike $${index} or name ilike $${index})`)
    params.push(`%${values.query}%`)
    index += 1
  }

  return {
    clause: conditions.length ? `where ${conditions.join(' and ')}` : '',
    params,
    nextIndex: index,
  }
}

async function readStats() {
  const result = await getPool().query(`
    select
      count(*)::int as total,
      count(*) filter (where status = 'Active')::int as active,
      count(*) filter (where status = 'Inactive')::int as inactive,
      count(*) filter (where created_on >= date_trunc('month', current_date))::int
        as new_this_month
    from public.dealers
  `)

  const row = result.rows[0] ?? {}

  return {
    total: row.total ?? 0,
    active: row.active ?? 0,
    inactive: row.inactive ?? 0,
    newThisMonth: row.new_this_month ?? 0,
  }
}

async function readFacets() {
  const result = await getPool().query(`
    select 'region' as facet, region as value from public.dealers group by region
    union all
    select 'zone' as facet, zone as value from public.dealers group by zone
    union all
    select 'territory' as facet, territory as value from public.dealers group by territory
    order by 1, 2
  `)

  const facets = { regions: [], zones: [], territories: [] }
  const buckets = { region: facets.regions, zone: facets.zones, territory: facets.territories }

  for (const row of result.rows) {
    buckets[row.facet]?.push(row.value)
  }

  return facets
}

/**
 * Returns everything the dashboard renders — the current page of accounts, the
 * matching total, the account stat cards and the filter options — read from the
 * database in a single request so the UI never falls out of sync with itself.
 */
export async function getDealersView({ filters = emptyFilters, page = 1, pageSize } = {}) {
  const size = normalizePageSize(pageSize)
  const requestedPage = normalizePage(page)

  if (!hasDatabase()) {
    const rows = getMemoryDealers()
    const matching = filterDealers(rows, filters)
    const paged = paginate(matching, requestedPage, size)

    return {
      dealers: paged.rows.map(mapDealerRow),
      total: matching.length,
      page: paged.page,
      pageSize: size,
      stats: calculateStats(rows),
      facets: collectFacets(rows),
      syncedAt: new Date().toISOString(),
      source: 'memory',
    }
  }

  const { clause, params, nextIndex } = buildFilterClause(filters)
  const countResult = await getPool().query(
    `select count(*)::int as total from public.dealers ${clause}`,
    params,
  )
  const total = countResult.rows[0]?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(requestedPage, lastPage)

  const pageResult = await getPool().query(
    `select ${dealerColumns}
     from public.dealers
     ${clause}
     order by code asc
     limit $${nextIndex} offset $${nextIndex + 1}`,
    [...params, size, (safePage - 1) * size],
  )

  const [stats, facets] = await Promise.all([readStats(), readFacets()])

  return {
    dealers: pageResult.rows.map(mapDealerRow),
    total,
    page: safePage,
    pageSize: size,
    stats,
    facets,
    syncedAt: new Date().toISOString(),
    source: 'database',
  }
}

export function emptyDealersView(pageSize) {
  return {
    dealers: [],
    total: 0,
    page: 1,
    pageSize: normalizePageSize(pageSize),
    stats: { ...emptyStats },
    facets: { ...emptyFacets },
    syncedAt: new Date().toISOString(),
    source: 'unavailable',
  }
}

export async function listDealers(options) {
  const view = await getDealersView(options)
  return view.dealers
}

/**
 * The verification queue behind the header bell, newest first. Self-registrations
 * land unverified, so an unverified row is exactly an account waiting on review.
 */
export async function listUnverifiedDealerNotices(limit = NOTIFICATION_LIMIT) {
  // Rows created before created_at existed only carry the date they were made.
  const createdAt = (row) => new Date(row.created_at ?? row.created_on)
  const toNotice = (row) => ({
    code: row.code,
    name: row.name,
    createdAt: createdAt(row).toISOString(),
  })

  if (!hasDatabase()) {
    return getMemoryDealers()
      .filter((row) => row.verified !== true)
      .sort((a, b) => createdAt(b) - createdAt(a))
      .slice(0, limit)
      .map(toNotice)
  }

  const result = await getPool().query(
    `select code, name, created_at, created_on
     from public.dealers
     where not verified
     order by created_at desc, code asc
     limit $1`,
    [limit],
  )

  return result.rows.map(toNotice)
}

export async function createDealer(dealer, actor = '') {
  const verifiedAt = dealer.verified ? new Date().toISOString() : null
  const passwordHash = dealer.password ? await hashPassword(dealer.password) : null

  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()

    if (memoryDealers.some((item) => item.code === dealer.code)) {
      const error = new Error('A dealer with this code already exists.')
      error.code = '23505'
      throw error
    }

    const created = {
      ...dealer,
      password: undefined,
      password_hash: passwordHash,
      store_code: dealer.storeCode,
      created_on: today(),
      created_at: new Date().toISOString(),
      created_by: actor,
      verified_by: dealer.verified ? actor : '',
      verified_at: verifiedAt,
    }
    memoryDealers.unshift(created)
    memoryDealers.sort((a, b) => a.code.localeCompare(b.code))
    return mapDealerRow(created)
  }

  const result = await getPool().query(`
    insert into public.dealers (
      code, name, region, zone, territory, status,
      email, store_code, role, verified, verified_by, verified_at, created_by,
      password_hash
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    returning ${dealerColumns}
  `, [
    dealer.code,
    dealer.name,
    dealer.region,
    dealer.zone,
    dealer.territory,
    dealer.status,
    dealer.email || null,
    dealer.storeCode || null,
    dealer.role || null,
    dealer.verified,
    dealer.verified ? actor : null,
    verifiedAt,
    actor || null,
    passwordHash,
  ])

  return mapDealerRow(result.rows[0])
}

export async function updateDealer(code, dealer, actor = '') {
  // Blank means "keep the current password" rather than "clear it".
  const passwordHash = dealer.password ? await hashPassword(dealer.password) : null

  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()
    const index = memoryDealers.findIndex((item) => item.code === code)

    if (index === -1) {
      return null
    }

    const previous = memoryDealers[index]
    const newlyVerified = dealer.verified && !previous.verified

    memoryDealers[index] = {
      ...previous,
      ...dealer,
      code,
      password: undefined,
      password_hash: passwordHash ?? previous.password_hash,
      store_code: dealer.storeCode,
      created_on: previous.created_on,
      created_at: previous.created_at,
      created_by: previous.created_by,
      verified_by: dealer.verified ? (newlyVerified ? actor : previous.verified_by) : '',
      verified_at: dealer.verified
        ? (newlyVerified ? new Date().toISOString() : previous.verified_at)
        : null,
    }
    return mapDealerRow(memoryDealers[index])
  }

  // verified_by / verified_at are stamped only on the false -> true transition,
  // so later edits keep naming whoever actually did the verifying. Un-verifying
  // clears them rather than leaving a stale name behind.
  const result = await getPool().query(`
    update public.dealers
    set name = $2,
        region = $3,
        zone = $4,
        territory = $5,
        status = $6,
        email = $7,
        store_code = $8,
        role = $9,
        verified = $10,
        verified_by = case
          when $10 and not verified then $11
          when not $10 then null
          else verified_by
        end,
        verified_at = case
          when $10 and not verified then now()
          when not $10 then null
          else verified_at
        end,
        password_hash = coalesce($12, password_hash),
        updated_at = now()
    where code = $1
    returning ${dealerColumns}
  `, [
    code,
    dealer.name,
    dealer.region,
    dealer.zone,
    dealer.territory,
    dealer.status,
    dealer.email || null,
    dealer.storeCode || null,
    dealer.role || null,
    dealer.verified,
    actor || null,
    passwordHash,
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
