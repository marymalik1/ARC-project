const supportedStatuses = new Set(['Pending', 'Closed'])

export const EMPTY_TICKET_FILTERS = Object.freeze({
  dealerCode: '',
  dealerName: '',
  region: '',
  zone: '',
  territory: '',
  chatType: '',
  fromDate: '',
  toDate: '',
  tab: 'pending',
  query: '',
})

const normalize = (value) => String(value ?? '').trim().toLowerCase()

export function filterTickets(tickets, query) {
  const needle = normalize(query)

  if (!needle) {
    return tickets
  }

  return tickets.filter((ticket) => normalize([
    ticket.id,
    ticket.subject,
    ticket.preview,
    ticket.customer?.name,
    ticket.customer?.dealerCode,
    ...(ticket.messages ?? []).map((message) => message.body),
  ].join(' ')).includes(needle))
}

export function applyTicketFilters(tickets, filters) {
  return filterTickets(tickets, filters.query).filter((ticket) => {
    const matchesTab = filters.tab === 'all'
      || normalize(ticket.status) === normalize(filters.tab)
    const matchesDealerCode = !filters.dealerCode
      || normalize(ticket.customer?.dealerCode).includes(normalize(filters.dealerCode))
    const matchesDealerName = !filters.dealerName
      || normalize(ticket.customer?.name).includes(normalize(filters.dealerName))
    const matchesRegion = !filters.region || ticket.region === filters.region
    const matchesZone = !filters.zone || ticket.zone === filters.zone
    const matchesTerritory = !filters.territory || ticket.territory === filters.territory
    const matchesType = !filters.chatType || ticket.chatType === filters.chatType
    const matchesFrom = !filters.fromDate || ticket.createdDate >= filters.fromDate
    const matchesTo = !filters.toDate || ticket.createdDate <= filters.toDate

    return matchesTab
      && matchesDealerCode
      && matchesDealerName
      && matchesRegion
      && matchesZone
      && matchesTerritory
      && matchesType
      && matchesFrom
      && matchesTo
  })
}

export function validateMessage(message) {
  const value = message.trim()

  if (!value) {
    return { ok: false, error: 'Please enter a message.' }
  }

  return { ok: true, value }
}

export function updateTicketStatus(tickets, ticketId, status) {
  if (!supportedStatuses.has(status)) {
    throw new Error(`Unsupported ticket status: ${status}`)
  }

  return tickets.map((ticket) => (
    ticket.id === ticketId ? { ...ticket, status } : ticket
  ))
}

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function ticketsToCsv(tickets) {
  const headings = [
    'Ticket ID',
    'Subject',
    'Dealer',
    'Status',
    'Chat Type',
    'Priority',
    'Created On',
    'Channel',
    'Assigned To',
  ]
  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.subject,
    ticket.customer?.name,
    ticket.status,
    ticket.chatType,
    ticket.priority,
    ticket.createdOn,
    ticket.channel,
    ticket.assignedTo,
  ])

  return [headings, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}
