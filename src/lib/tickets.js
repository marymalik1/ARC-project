const supportedStatuses = new Set(['Open', 'Pending', 'Resolved', 'Closed'])

export function filterTickets(tickets, query) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return tickets
  }

  return tickets.filter((ticket) => {
    const searchable = [
      ticket.id,
      ticket.customer.name,
      ticket.customer.dealerCode,
    ].join(' ').toLowerCase()

    return searchable.includes(normalizedQuery)
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
