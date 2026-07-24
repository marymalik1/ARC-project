export const emptyFilters = Object.freeze({
  code: '',
  name: '',
  region: 'All Regions',
  zone: 'All Zones',
  territory: 'All Territories',
  query: '',
})

const validStatuses = new Set(['Active', 'Inactive'])

function includesIgnoreCase(value, filter) {
  return value.toLowerCase().includes(filter.trim().toLowerCase())
}

export function filterDealers(dealers, filters) {
  return dealers.filter((dealer) => {
    const queryMatches =
      !filters.query ||
      includesIgnoreCase(dealer.code, filters.query) ||
      includesIgnoreCase(dealer.name, filters.query)

    return (
      includesIgnoreCase(dealer.code, filters.code) &&
      includesIgnoreCase(dealer.name, filters.name) &&
      (filters.region === 'All Regions' || dealer.region === filters.region) &&
      (filters.zone === 'All Zones' || dealer.zone === filters.zone) &&
      (filters.territory === 'All Territories' || dealer.territory === filters.territory) &&
      queryMatches
    )
  })
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
  const createdOn = row.created_on instanceof Date
    ? row.created_on
    : new Date(`${row.created_on}T00:00:00.000Z`)

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
