import { initialDealerRows } from '../data/dealers'
import { getPool, hasDatabase } from './database'
import {
  ANY_REGION,
  ANY_TERRITORY,
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

const dealerColumns = 'code, name, region, zone, territory, status, created_on'

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

export async function createDealer(dealer) {
  if (!hasDatabase()) {
    const memoryDealers = getMemoryDealers()

    if (memoryDealers.some((item) => item.code === dealer.code)) {
      const error = new Error('A dealer with this code already exists.')
      error.code = '23505'
      throw error
    }

    const created = { ...dealer, created_on: today() }
    memoryDealers.unshift(created)
    memoryDealers.sort((a, b) => a.code.localeCompare(b.code))
    return mapDealerRow(created)
  }

  const result = await getPool().query(`
    insert into public.dealers (code, name, region, zone, territory, status)
    values ($1, $2, $3, $4, $5, $6)
    returning ${dealerColumns}
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
      created_on: memoryDealers[index].created_on,
    }
    return mapDealerRow(memoryDealers[index])
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
    returning ${dealerColumns}
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
