export const emptyFilters = Object.freeze({
  code: '',
  name: '',
  region: 'All Regions',
  zone: 'All Zones',
  territory: 'All Territories',
  query: '',
})

export const ANY_REGION = emptyFilters.region
export const ANY_ZONE = emptyFilters.zone
export const ANY_TERRITORY = emptyFilters.territory

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 500

export const statColumns = Object.freeze([
  { key: 'total', label: 'All Accounts', icon: 'all' },
  { key: 'active', label: 'Active Accounts', icon: 'active' },
  { key: 'inactive', label: 'Inactive Accounts', icon: 'inactive' },
  { key: 'newThisMonth', label: 'New This Month', icon: 'new' },
])

export const emptyStats = Object.freeze({
  total: 0,
  active: 0,
  inactive: 0,
  newThisMonth: 0,
})

export const emptyFacets = Object.freeze({
  regions: [],
  zones: [],
  territories: [],
})

const validStatuses = new Set(['Active', 'Inactive'])

function includesIgnoreCase(value, filter) {
  return String(value).toLowerCase().includes(String(filter).trim().toLowerCase())
}

export function normalizeFilters(input) {
  return {
    code: String(input?.code ?? '').trim(),
    name: String(input?.name ?? '').trim(),
    region: String(input?.region ?? '').trim() || ANY_REGION,
    zone: String(input?.zone ?? '').trim() || ANY_ZONE,
    territory: String(input?.territory ?? '').trim() || ANY_TERRITORY,
    query: String(input?.query ?? '').trim(),
  }
}

export function normalizePage(input) {
  const page = Number.parseInt(input, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function normalizePageSize(input) {
  const pageSize = Number.parseInt(input, 10)

  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return DEFAULT_PAGE_SIZE
  }

  return Math.min(pageSize, MAX_PAGE_SIZE)
}

export function filtersToSearchParams(filters, page, pageSize) {
  const values = normalizeFilters(filters)
  const params = new URLSearchParams()

  if (values.code) params.set('code', values.code)
  if (values.name) params.set('name', values.name)
  if (values.region !== ANY_REGION) params.set('region', values.region)
  if (values.zone !== ANY_ZONE) params.set('zone', values.zone)
  if (values.territory !== ANY_TERRITORY) params.set('territory', values.territory)
  if (values.query) params.set('q', values.query)
  params.set('page', String(normalizePage(page)))
  params.set('pageSize', String(normalizePageSize(pageSize)))

  return params
}

export function filterDealers(dealers, filters) {
  const values = normalizeFilters(filters)

  return dealers.filter((dealer) => {
    const queryMatches =
      !values.query ||
      includesIgnoreCase(dealer.code, values.query) ||
      includesIgnoreCase(dealer.name, values.query)

    return (
      includesIgnoreCase(dealer.code, values.code) &&
      includesIgnoreCase(dealer.name, values.name) &&
      (values.region === ANY_REGION || dealer.region === values.region) &&
      (values.zone === ANY_ZONE || dealer.zone === values.zone) &&
      (values.territory === ANY_TERRITORY || dealer.territory === values.territory) &&
      queryMatches
    )
  })
}

export function totalPages(total, pageSize) {
  return Math.max(1, Math.ceil(total / normalizePageSize(pageSize)))
}

export function paginate(rows, page, pageSize) {
  const size = normalizePageSize(pageSize)
  const safePage = Math.min(normalizePage(page), totalPages(rows.length, size))
  const start = (safePage - 1) * size

  return { rows: rows.slice(start, start + size), page: safePage }
}

function toDate(value) {
  if (value instanceof Date) {
    return value
  }

  const text = String(value)
  return new Date(text.length > 10 ? text : `${text}T00:00:00.000Z`)
}

export function isSameMonth(value, reference = new Date()) {
  const date = toDate(value)

  return (
    date.getUTCFullYear() === reference.getUTCFullYear() &&
    date.getUTCMonth() === reference.getUTCMonth()
  )
}

export function calculateStats(rows, reference = new Date()) {
  return rows.reduce((stats, row) => ({
    total: stats.total + 1,
    active: stats.active + (row.status === 'Active' ? 1 : 0),
    inactive: stats.inactive + (row.status === 'Inactive' ? 1 : 0),
    newThisMonth:
      stats.newThisMonth + (isSameMonth(row.created_on ?? row.createdOn, reference) ? 1 : 0),
  }), { ...emptyStats })
}

function sortedUnique(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function collectFacets(rows) {
  return {
    regions: sortedUnique(rows, 'region'),
    zones: sortedUnique(rows, 'zone'),
    territories: sortedUnique(rows, 'territory'),
  }
}

export function formatCount(value) {
  return Number(value ?? 0).toLocaleString('en-US')
}

export function validateDealer(input) {
  const value = {
    code: String(input?.code ?? '').trim().toUpperCase(),
    name: String(input?.name ?? '').trim(),
    region: String(input?.region ?? '').trim(),
    zone: String(input?.zone ?? '').trim(),
    territory: String(input?.territory ?? '').trim(),
    status: String(input?.status ?? '').trim(),
  }

  if (!/^D\d{5}$/.test(value.code)) {
    return { ok: false, error: 'Dealer code must use the format D00123.' }
  }

  for (const field of ['name', 'region', 'zone', 'territory']) {
    if (!value[field]) {
      return { ok: false, error: `${field} is required.` }
    }
  }

  if (!validStatuses.has(value.status)) {
    return { ok: false, error: 'Status must be Active or Inactive.' }
  }

  return { ok: true, value }
}

export function mapDealerRow(row) {
  const createdOn = toDate(row.created_on)

  return {
    code: row.code,
    name: row.name,
    region: row.region,
    zone: row.zone,
    territory: row.territory,
    status: row.status,
    createdOn: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(createdOn),
  }
}
