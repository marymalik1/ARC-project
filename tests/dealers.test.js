import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_PAGE_SIZE,
  calculateStats,
  collectFacets,
  filterDealers,
  filtersToSearchParams,
  formatCount,
  mapDealerRow,
  normalizePageSize,
  paginate,
  totalPages,
  validateDealer,
} from '../src/lib/dealers.js'

const rows = [
  {
    code: 'D00123',
    name: 'Ali Traders',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Lahore City',
    status: 'Active',
    created_on: '2025-05-18',
  },
  {
    code: 'D00124',
    name: 'Khan Associates',
    region: 'Karachi',
    zone: 'South Zone',
    territory: 'Karachi South',
    status: 'Active',
    created_on: '2025-05-18',
  },
  {
    code: 'D00125',
    name: 'Usman Enterprises',
    region: 'Islamabad',
    zone: 'Central Zone',
    territory: 'Islamabad East',
    status: 'Inactive',
    created_on: '2025-06-02',
  },
]

test('filterDealers matches the submitted search query', () => {
  const result = filterDealers(rows, {
    code: '',
    name: '',
    region: 'All Regions',
    zone: 'All Zones',
    territory: 'All Territories',
    query: 'Khan',
  })

  assert.deepEqual(result.map((dealer) => dealer.code), ['D00124'])
})

test('validateDealer trims valid account input', () => {
  const result = validateDealer({
    code: ' D00128 ',
    name: ' Noor Autos ',
    region: ' Lahore ',
    zone: ' North Zone ',
    territory: ' Lahore City ',
    status: 'Active',
  })

  assert.equal(result.ok, true)
  assert.equal(result.value.code, 'D00128')
  assert.equal(result.value.name, 'Noor Autos')
})

test('validateDealer rejects an unsupported status', () => {
  const result = validateDealer({
    code: 'D00128',
    name: 'Noor Autos',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Lahore City',
    status: 'Pending',
  })

  assert.equal(result.ok, false)
  assert.match(result.error, /status/i)
})

test('mapDealerRow converts database fields for the UI', () => {
  const result = mapDealerRow({
    code: 'D00123',
    name: 'Ali Traders',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Lahore City',
    status: 'Active',
    created_on: new Date('2025-05-18T00:00:00.000Z'),
  })

  assert.equal(result.createdOn, '18 May 2025')
})

test('calculateStats counts statuses and this month signups from stored rows', () => {
  const stats = calculateStats(rows, new Date('2025-06-15T00:00:00.000Z'))

  assert.deepEqual(stats, {
    total: 3,
    active: 2,
    inactive: 1,
    newThisMonth: 1,
  })
})

test('collectFacets lists the distinct filter values in the data', () => {
  assert.deepEqual(collectFacets(rows), {
    regions: ['Islamabad', 'Karachi', 'Lahore'],
    zones: ['Central Zone', 'North Zone', 'South Zone'],
    territories: ['Islamabad East', 'Karachi South', 'Lahore City'],
  })
})

test('paginate returns the requested slice and clamps past the last page', () => {
  const second = paginate(rows, 2, 2)
  assert.deepEqual(second.rows.map((row) => row.code), ['D00125'])
  assert.equal(second.page, 2)

  const clamped = paginate(rows, 9, 2)
  assert.equal(clamped.page, 2)
})

test('totalPages and normalizePageSize guard the pagination inputs', () => {
  assert.equal(totalPages(0, 10), 1)
  assert.equal(totalPages(1250, 10), 125)
  // Anything unusable falls back to the default rather than to a literal, so
  // changing the page size does not silently break these.
  assert.equal(normalizePageSize('abc'), DEFAULT_PAGE_SIZE)
  assert.equal(normalizePageSize('0'), DEFAULT_PAGE_SIZE)
  assert.equal(normalizePageSize('9000'), 500)
})

test('filtersToSearchParams only sends the filters that narrow the query', () => {
  const params = filtersToSearchParams({
    code: '',
    name: '',
    region: 'Lahore',
    zone: 'All Zones',
    territory: 'All Territories',
    query: 'Khan',
  }, 3, 10)

  assert.equal(params.get('region'), 'Lahore')
  assert.equal(params.get('zone'), null)
  assert.equal(params.get('q'), 'Khan')
  assert.equal(params.get('page'), '3')
  assert.equal(params.get('pageSize'), '10')
})

test('formatCount renders thousands the way the stat cards do', () => {
  assert.equal(formatCount(1250), '1,250')
  assert.equal(formatCount(undefined), '0')
})
