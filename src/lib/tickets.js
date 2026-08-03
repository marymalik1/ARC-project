const supportedStatuses = new Set(['Pending', 'Closed'])
const supportedTabs = new Set(['all', 'pending', 'closed'])

// The support desk reports in Pakistan Standard Time.
const DISPLAY_TIME_ZONE = 'Asia/Karachi'

export const TICKET_PAGE_SIZE = 10
export const MAX_TICKET_PAGE_SIZE = 500

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

export const emptyTicketCounts = Object.freeze({ all: 0, pending: 0, closed: 0 })

export const emptyTicketFacets = Object.freeze({
  regions: [],
  zones: [],
  territories: [],
  chatTypes: [],
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

export function normalizeTicketFilters(input) {
  const tab = String(input?.tab ?? '').trim().toLowerCase()

  return {
    dealerCode: String(input?.dealerCode ?? '').trim(),
    dealerName: String(input?.dealerName ?? '').trim(),
    region: String(input?.region ?? '').trim(),
    zone: String(input?.zone ?? '').trim(),
    territory: String(input?.territory ?? '').trim(),
    chatType: String(input?.chatType ?? '').trim(),
    fromDate: String(input?.fromDate ?? '').trim(),
    toDate: String(input?.toDate ?? '').trim(),
    tab: supportedTabs.has(tab) ? tab : EMPTY_TICKET_FILTERS.tab,
    query: String(input?.query ?? '').trim(),
  }
}

export function normalizeTicketPage(input) {
  const page = Number.parseInt(input, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function normalizeTicketPageSize(input) {
  const pageSize = Number.parseInt(input, 10)

  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return TICKET_PAGE_SIZE
  }

  return Math.min(pageSize, MAX_TICKET_PAGE_SIZE)
}

export function ticketFiltersToSearchParams(filters, page, pageSize) {
  const values = normalizeTicketFilters(filters)
  const params = new URLSearchParams()

  for (const field of [
    'dealerCode',
    'dealerName',
    'region',
    'zone',
    'territory',
    'chatType',
    'fromDate',
    'toDate',
    'query',
  ]) {
    if (values[field]) {
      params.set(field, values[field])
    }
  }

  params.set('tab', values.tab)
  params.set('page', String(normalizeTicketPage(page)))
  params.set('pageSize', String(normalizeTicketPageSize(pageSize)))

  return params
}

export function ticketTotalPages(total, pageSize) {
  return Math.max(1, Math.ceil(total / normalizeTicketPageSize(pageSize)))
}

export function paginateTickets(tickets, page, pageSize) {
  const size = normalizeTicketPageSize(pageSize)
  const safePage = Math.min(normalizeTicketPage(page), ticketTotalPages(tickets.length, size))
  const start = (safePage - 1) * size

  return { rows: tickets.slice(start, start + size), page: safePage }
}

export function calculateTicketCounts(tickets) {
  return tickets.reduce((counts, ticket) => ({
    all: counts.all + 1,
    pending: counts.pending + (ticket.status === 'Pending' ? 1 : 0),
    closed: counts.closed + (ticket.status === 'Closed' ? 1 : 0),
  }), { ...emptyTicketCounts })
}

function sortedUnique(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Collects the distinct filter values from mapped tickets. */
export function collectTicketFacets(tickets) {
  return {
    regions: sortedUnique(tickets, 'region'),
    zones: sortedUnique(tickets, 'zone'),
    territories: sortedUnique(tickets, 'territory'),
    chatTypes: sortedUnique(tickets, 'chatType'),
  }
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value)
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
}

function formatDay(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
}

function isoDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date)
}

/** Relative label for the inbox list: a time today, "Yesterday", else the day. */
export function ticketListTime(createdAt, reference = new Date()) {
  const date = toDate(createdAt)
  const created = isoDate(date)
  const today = isoDate(reference)

  if (created === today) {
    return formatTime(date)
  }

  const yesterday = new Date(reference)
  yesterday.setDate(yesterday.getDate() - 1)

  if (created === isoDate(yesterday)) {
    return 'Yesterday'
  }

  return formatDay(date)
}

export function mapMessageRow(row) {
  const sentAt = toDate(row.sent_at)

  return {
    id: `m-${row.id}`,
    sender: row.sender,
    time: formatTime(sentAt),
    body: row.body,
    // The object key never leaves the server: the browser asks for the file by
    // message id and the route decides whether it may have it.
    attachment: row.attachment_name
      ? {
        messageId: row.id,
        name: row.attachment_name,
        type: row.attachment_type ?? '',
        size: Number(row.attachment_size) || 0,
      }
      : null,
  }
}

export function mapTicketRow(row, { messages = [], tags = [], reference = new Date() } = {}) {
  const createdAt = toDate(row.created_at)

  return {
    id: row.id,
    subject: row.subject,
    priority: row.priority,
    status: row.status,
    chatType: row.chat_type,
    region: row.region,
    zone: row.zone,
    territory: row.territory,
    channel: row.channel,
    assignedTo: row.assigned_to,
    preview: row.preview,
    listTime: ticketListTime(createdAt, reference),
    createdDate: isoDate(createdAt),
    createdOn: `${new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: DISPLAY_TIME_ZONE,
    }).format(createdAt)}, ${formatTime(createdAt)}`,
    customer: {
      name: row.customer_name,
      dealerCode: row.customer_dealer_code,
      location: row.customer_location,
      phone: row.customer_phone,
      email: row.customer_email,
    },
    tags,
    messages: messages.map(mapMessageRow),
  }
}

// Types an agent can open a new conversation under.
export const chatTypes = Object.freeze([
  'Login Issue',
  'Report Issue',
  'Ledger Issue',
  'Product Issue',
  'Other',
])

export function validateNewChat(input) {
  const value = {
    dealerCode: String(input?.dealerCode ?? '').trim().toUpperCase(),
    subject: String(input?.subject ?? '').trim(),
    chatType: String(input?.chatType ?? '').trim(),
    message: String(input?.message ?? '').trim(),
  }

  if (!/^D\d{5}$/.test(value.dealerCode)) {
    return { ok: false, error: 'A valid dealer code is required.' }
  }

  if (!value.subject) {
    return { ok: false, error: 'A subject is required.' }
  }

  if (!chatTypes.includes(value.chatType)) {
    return { ok: false, error: 'Select a valid chat type.' }
  }

  return { ok: true, value }
}

export function validateMessage(message) {
  const value = String(message ?? '').trim()

  if (!value) {
    return { ok: false, error: 'Please enter a message.' }
  }

  return { ok: true, value }
}

export function validateTicketStatus(status) {
  if (!supportedStatuses.has(status)) {
    return { ok: false, error: `Unsupported ticket status: ${status}` }
  }

  return { ok: true, value: status }
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
    'Ticket Number',
    'Dealer Code',
    'Dealer Name',
    'Region',
    'Zone',
    'Territory',
    'Subject',
    'Assigned To',
    'Status',
    'Creation Time and Date',
  ]
  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.customer?.dealerCode,
    ticket.customer?.name,
    ticket.region,
    ticket.zone,
    ticket.territory,
    ticket.subject,
    ticket.assignedTo,
    ticket.status,
    ticket.createdOn,
  ])

  return [headings, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')
}
