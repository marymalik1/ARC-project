import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterTickets,
  updateTicketStatus,
  validateMessage,
} from '../src/lib/tickets.js'

const tickets = [
  {
    id: 'TKT-000321',
    customer: { name: 'Ali Traders', dealerCode: 'D00123' },
    status: 'Open',
    priority: 'High',
  },
  {
    id: 'TKT-000320',
    customer: { name: 'Khan Associates', dealerCode: 'D00124' },
    status: 'Open',
    priority: 'Medium',
  },
]

test('filterTickets matches ticket IDs, customer names, and dealer codes', () => {
  assert.deepEqual(
    filterTickets(tickets, '000320').map((ticket) => ticket.id),
    ['TKT-000320'],
  )
  assert.deepEqual(
    filterTickets(tickets, 'ali traders').map((ticket) => ticket.id),
    ['TKT-000321'],
  )
  assert.deepEqual(
    filterTickets(tickets, 'd00124').map((ticket) => ticket.id),
    ['TKT-000320'],
  )
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
  const updated = updateTicketStatus(tickets, 'TKT-000321', 'Resolved')

  assert.equal(updated[0].status, 'Resolved')
  assert.equal(updated[1], tickets[1])
  assert.equal(tickets[0].status, 'Open')
})

test('updateTicketStatus rejects unsupported statuses', () => {
  assert.throws(
    () => updateTicketStatus(tickets, 'TKT-000321', 'Deleted'),
    /unsupported ticket status/i,
  )
})
