import assert from 'node:assert/strict'
import test from 'node:test'
import { chatCountSummary, initialTickets } from '../src/data/tickets.js'
import {
  applyTicketFilters,
  EMPTY_TICKET_FILTERS,
  filterTickets,
  ticketsToCsv,
  updateTicketStatus,
  validateMessage,
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

test('reference ticket data supplies the inbox and detail fields', () => {
  assert.deepEqual(chatCountSummary, { all: 320, pending: 82, closed: 238 })
  assert.deepEqual(
    initialTickets.map(({ id, subject, status }) => ({ id, subject, status })),
    [
      { id: 'TKT-000321', subject: 'Unable to login to the ARC portal', status: 'Pending' },
      { id: 'TKT-000320', subject: 'Report not generating', status: 'Pending' },
      { id: 'TKT-000319', subject: 'Incorrect ledger amount', status: 'Pending' },
      { id: 'TKT-000318', subject: 'Product expired on dashboard', status: 'Pending' },
      { id: 'TKT-000317', subject: 'Export file is blank', status: 'Closed' },
    ],
  )

  for (const ticket of initialTickets) {
    assert.ok(ticket.chatType)
    assert.ok(ticket.region)
    assert.ok(ticket.zone)
    assert.ok(ticket.territory)
    assert.match(ticket.createdDate, /^\d{4}-\d{2}-\d{2}$/)
  }
})
