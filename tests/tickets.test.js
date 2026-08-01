import assert from 'node:assert/strict'
import test from 'node:test'
import { initialMessageRows, initialTicketRows } from '../src/data/tickets.js'
import {
  applyTicketFilters,
  calculateTicketCounts,
  collectTicketFacets,
  EMPTY_TICKET_FILTERS,
  filterTickets,
  mapTicketRow,
  normalizeTicketFilters,
  paginateTickets,
  ticketFiltersToSearchParams,
  ticketListTime,
  ticketsToCsv,
  updateTicketStatus,
  validateMessage,
  validateTicketStatus,
} from '../src/lib/tickets.js'

const tickets = [
  {
    id: 'TKT-000321',
    subject: 'Unable to login to the ARC portal',
    status: 'Pending',
    priority: 'High',
    chatType: 'Login Issue',
    region: 'North',
    zone: 'North Zone',
    territory: 'Lahore City',
    createdDate: '2025-05-18',
    createdOn: '18 May 2025, 10:30 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Invalid credentials are shown.',
    customer: { name: 'Ali Traders', dealerCode: 'D00123' },
    messages: [{ body: 'The password reset link did not arrive.' }],
  },
  {
    id: 'TKT-000320',
    subject: 'Report not generating',
    status: 'Pending',
    priority: 'Medium',
    chatType: 'Report Issue',
    region: 'South',
    zone: 'South Zone',
    territory: 'Karachi South',
    createdDate: '2025-05-17',
    createdOn: '17 May 2025, 09:45 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Monthly report is unavailable.',
    customer: { name: 'Khan, Associates', dealerCode: 'D00124' },
    messages: [{ body: 'The report button keeps loading.' }],
  },
  {
    id: 'TKT-000317',
    subject: 'Export file is blank',
    status: 'Closed',
    priority: 'Low',
    chatType: 'Export Issue',
    region: 'West',
    zone: 'West Zone',
    territory: 'Peshawar City',
    createdDate: '2025-05-16',
    createdOn: '16 May 2025, 11:10 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Downloaded file contains no rows.',
    customer: { name: 'Bilal & Sons', dealerCode: 'D00127' },
    messages: [{ body: 'The export has headers only.' }],
  },
]

test('filterTickets searches subjects, customer fields, previews, and messages', () => {
  assert.deepEqual(filterTickets(tickets, 'login').map(({ id }) => id), ['TKT-000321'])
  assert.deepEqual(filterTickets(tickets, 'D00124').map(({ id }) => id), ['TKT-000320'])
  assert.deepEqual(filterTickets(tickets, 'headers only').map(({ id }) => id), ['TKT-000317'])
})

test('applyTicketFilters combines tab, dealer, territory, type, and date filters', () => {
  assert.deepEqual(
    applyTicketFilters(tickets, {
      ...EMPTY_TICKET_FILTERS,
      tab: 'pending',
      dealerName: 'khan',
      region: 'South',
      zone: 'South Zone',
      territory: 'Karachi South',
      chatType: 'Report Issue',
      fromDate: '2025-05-17',
      toDate: '2025-05-17',
    }).map(({ id }) => id),
    ['TKT-000320'],
  )
  assert.deepEqual(
    applyTicketFilters(tickets, { ...EMPTY_TICKET_FILTERS, tab: 'closed' }).map(({ id }) => id),
    ['TKT-000317'],
  )
})

test('ticketsToCsv exports headers and escapes commas', () => {
  const csv = ticketsToCsv([tickets[1]])
  assert.match(csv, /^Ticket ID,Subject,Dealer,Status,Chat Type,Priority,Created On,Channel,Assigned To/m)
  assert.match(csv, /"Khan, Associates"/)
  assert.match(csv, /TKT-000320,Report not generating/)
})

test('validateMessage trims a reply and rejects an empty message', () => {
  assert.deepEqual(validateMessage('  Password reset sent.  '), {
    ok: true,
    value: 'Password reset sent.',
  })
  assert.deepEqual(validateMessage('   '), {
    ok: false,
    error: 'Please enter a message.',
  })
})

test('updateTicketStatus changes only the selected ticket', () => {
  const updated = updateTicketStatus(tickets, 'TKT-000321', 'Closed')

  assert.equal(updated[0].status, 'Closed')
  assert.equal(updated[1], tickets[1])
  assert.equal(tickets[0].status, 'Pending')
})

test('updateTicketStatus rejects unsupported statuses', () => {
  assert.throws(
    () => updateTicketStatus(tickets, 'TKT-000321', 'Deleted'),
    /unsupported ticket status/i,
  )
})

test('seed ticket rows use the database column shape', () => {
  assert.deepEqual(
    initialTicketRows.map(({ id, subject, status }) => ({ id, subject, status })),
    [
      { id: 'TKT-000321', subject: 'Unable to login to the ARC portal', status: 'Pending' },
      { id: 'TKT-000320', subject: 'Report not generating', status: 'Pending' },
      { id: 'TKT-000319', subject: 'Incorrect ledger amount', status: 'Pending' },
      { id: 'TKT-000318', subject: 'Product expired on dashboard', status: 'Pending' },
      { id: 'TKT-000317', subject: 'Export file is blank', status: 'Closed' },
    ],
  )

  for (const row of initialTicketRows) {
    assert.ok(row.chat_type)
    assert.ok(row.region)
    assert.ok(row.zone)
    assert.ok(row.territory)
    assert.ok(Number.isFinite(Date.parse(row.created_at)))
  }
})

test('mapTicketRow builds the UI ticket from stored columns and its thread', () => {
  const row = initialTicketRows[0]
  const ticket = mapTicketRow(row, {
    messages: initialMessageRows.filter((message) => message.ticket_id === row.id),
    tags: ['Follow Up'],
    reference: new Date('2026-08-01T00:00:00.000Z'),
  })

  assert.equal(ticket.chatType, 'Login Issue')
  assert.equal(ticket.createdDate, '2025-05-18')
  assert.equal(ticket.createdOn, '18 May 2025, 10:30 AM')
  assert.equal(ticket.customer.dealerCode, 'D00123')
  assert.deepEqual(ticket.tags, ['Follow Up'])
  assert.equal(ticket.messages.length, 5)
  assert.equal(ticket.messages[0].time, '10:30 AM')
})

test('ticketListTime is relative to now, not a stored label', () => {
  const reference = new Date('2025-05-18T12:00:00.000Z')

  assert.equal(ticketListTime('2025-05-18T05:30:00.000Z', reference), '10:30 AM')
  assert.equal(ticketListTime('2025-05-17T10:20:00.000Z', reference), 'Yesterday')
  assert.equal(ticketListTime('2025-05-16T06:10:00.000Z', reference), '16 May')
})

test('calculateTicketCounts drives the inbox tab counters', () => {
  const tabs = calculateTicketCounts([
    { status: 'Pending' },
    { status: 'Pending' },
    { status: 'Closed' },
  ])

  assert.deepEqual(tabs, { all: 3, pending: 2, closed: 1 })
})

test('collectTicketFacets lists the distinct filter values in the data', () => {
  assert.deepEqual(collectTicketFacets(tickets), {
    regions: ['North', 'South', 'West'],
    zones: ['North Zone', 'South Zone', 'West Zone'],
    territories: ['Karachi South', 'Lahore City', 'Peshawar City'],
    chatTypes: ['Export Issue', 'Login Issue', 'Report Issue'],
  })
})

test('paginateTickets slices the inbox and clamps past the last page', () => {
  const second = paginateTickets(tickets, 2, 2)
  assert.deepEqual(second.rows.map(({ id }) => id), ['TKT-000317'])

  assert.equal(paginateTickets(tickets, 9, 2).page, 2)
})

test('normalizeTicketFilters falls back to the pending tab for unknown tabs', () => {
  assert.equal(normalizeTicketFilters({ tab: 'archived' }).tab, 'pending')
  assert.equal(normalizeTicketFilters({ tab: 'CLOSED' }).tab, 'closed')
})

test('ticketFiltersToSearchParams only sends the filters that narrow the inbox', () => {
  const params = ticketFiltersToSearchParams({
    ...EMPTY_TICKET_FILTERS,
    region: 'North',
    query: 'login',
    tab: 'all',
  }, 2, 10)

  assert.equal(params.get('region'), 'North')
  assert.equal(params.get('zone'), null)
  assert.equal(params.get('query'), 'login')
  assert.equal(params.get('tab'), 'all')
  assert.equal(params.get('page'), '2')
})

test('validateTicketStatus accepts only the supported statuses', () => {
  assert.deepEqual(validateTicketStatus('Closed'), { ok: true, value: 'Closed' })
  assert.equal(validateTicketStatus('Deleted').ok, false)
})
