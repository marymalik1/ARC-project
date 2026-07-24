import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterDealers,
  mapDealerRow,
  validateDealer,
} from '../src/lib/dealers.js'

const dealers = [
  {
    code: 'D00123',
    name: 'Ali Traders',
    region: 'Lahore',
    zone: 'North Zone',
    territory: 'Lahore City',
    status: 'Active',
    createdOn: '18 May 2025',
  },
  {
    code: 'D00124',
    name: 'Khan Associates',
    region: 'Karachi',
    zone: 'South Zone',
    territory: 'Karachi South',
    status: 'Active',
    createdOn: '18 May 2025',
  },
]

test('filterDealers matches the submitted search query', () => {
  const result = filterDealers(dealers, {
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
