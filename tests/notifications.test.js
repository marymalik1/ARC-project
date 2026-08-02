import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NOTIFICATION_LIMIT,
  mergeNotifications,
  registrationNotification,
  relativeTime,
  ticketNotification,
} from '../src/lib/notifications.js'

test('the feed is newest first and capped at the limit', () => {
  const older = { id: 'old', at: '2026-08-01T09:00:00.000Z' }
  const newer = { id: 'new', at: '2026-08-02T09:00:00.000Z' }
  const filler = Array.from({ length: NOTIFICATION_LIMIT }, (row, index) => ({
    id: `filler-${index}`,
    at: '2026-07-01T09:00:00.000Z',
  }))

  const merged = mergeNotifications([[older, ...filler], [newer]])

  assert.equal(merged.length, NOTIFICATION_LIMIT)
  assert.deepEqual(merged.slice(0, 2).map((item) => item.id), ['new', 'old'])
})

test('notification ids are stable per source row', () => {
  const ticket = ticketNotification({
    id: 'TKT-000321',
    subject: 'Unable to login',
    customerName: 'Ali Traders',
    createdAt: '2026-08-02T09:00:00.000Z',
  })
  const registration = registrationNotification({
    code: 'D00123',
    name: 'Ali Traders',
    createdAt: '2026-08-02T09:00:00.000Z',
  })

  assert.equal(ticket.id, 'ticket:TKT-000321')
  assert.equal(ticket.title, 'New support chat from Ali Traders')
  assert.equal(ticket.href, '/customer-care')
  assert.equal(registration.id, 'dealer:D00123')
  assert.equal(registration.href, '/')
})

test('relativeTime stays relative for a week, then reads as a date', () => {
  const now = new Date('2026-08-02T12:00:00.000Z')

  assert.equal(relativeTime('2026-08-02T11:59:30.000Z', now), 'Just now')
  assert.equal(relativeTime('2026-08-02T11:20:00.000Z', now), '40m ago')
  assert.equal(relativeTime('2026-08-02T06:00:00.000Z', now), '6h ago')
  assert.equal(relativeTime('2026-07-30T12:00:00.000Z', now), '3d ago')
  assert.equal(relativeTime('2026-06-01T12:00:00.000Z', now), '01 Jun 2026')
  // A clock running ahead of ours must not announce work from the future.
  assert.equal(relativeTime('2026-08-02T12:30:00.000Z', now), 'Just now')
  assert.equal(relativeTime('not a date', now), '')
})
