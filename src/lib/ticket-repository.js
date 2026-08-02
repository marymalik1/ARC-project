import { initialDealerRows } from '../data/dealers'
import {
  initialMessageRows,
  initialTagRows,
  initialTicketRows,
} from '../data/tickets'
import { getPool, hasDatabase } from './database'
import { NOTIFICATION_LIMIT } from './notifications'
import {
  EMPTY_TICKET_FILTERS,
  applyTicketFilters,
  calculateTicketCounts,
  collectTicketFacets,
  emptyTicketCounts,
  emptyTicketFacets,
  mapTicketRow,
  normalizeTicketFilters,
  normalizeTicketPage,
  normalizeTicketPageSize,
  paginateTickets,
  validateTicketStatus,
} from './tickets'

const globalStore = globalThis

const ticketColumns = `
  id, subject, priority, status, chat_type, region, zone, territory,
  channel, assigned_to, preview, customer_name, customer_dealer_code,
  customer_location, customer_phone, customer_email, created_at
`

// attachment_path is deliberately absent from every read the browser sees: the
// object key is a server-side detail, and messages are addressed by id instead.
const messageColumns = `
  id, ticket_id, sender, body, sent_at,
  attachment_name, attachment_type, attachment_size
`

/**
 * Customer Care only surfaces chats whose dealer is both verified and active.
 * An unverified self-registration or a deactivated dealer must not appear in the
 * inbox, its counts, its filter options or the header bell — so every read path
 * below carries this, not just the list query.
 */
const VISIBLE_DEALER_SQL = `exists (
  select 1 from public.dealers d
  where d.code = public.support_tickets.customer_dealer_code
    and d.verified
    and d.status = 'Active'
)`

// The in-memory fallback has no join, so it matches on the seed rows directly.
function visibleDealerCodes() {
  return new Set(
    initialDealerRows
      .filter((row) => row.verified === true && row.status === 'Active')
      .map((row) => row.code),
  )
}

function getMemoryStore() {
  if (!globalStore.arcMemorySupport) {
    globalStore.arcMemorySupport = {
      tickets: initialTicketRows.map((row) => ({ ...row })),
      messages: initialMessageRows.map((row) => ({ ...row })),
      tags: initialTagRows.map((row) => ({ ...row })),
      ticketTags: [],
    }
  }

  return globalStore.arcMemorySupport
}

function memoryTickets(store, reference = new Date()) {
  const visible = visibleDealerCodes()

  return store.tickets.filter((row) => visible.has(row.customer_dealer_code)).map((row) => mapTicketRow(row, {
    messages: store.messages
      .filter((message) => message.ticket_id === row.id)
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at)),
    tags: store.ticketTags
      .filter((link) => link.ticket_id === row.id)
      .map((link) => link.tag),
    reference,
  }))
}

// Builds the `where` clause shared by the page query and its count.
function buildTicketFilterClause(filters, startIndex = 1) {
  const values = normalizeTicketFilters(filters)
  const conditions = [VISIBLE_DEALER_SQL]
  const params = []
  let index = startIndex

  const add = (sql, value) => {
    conditions.push(sql.replaceAll('$$', `$${index}`))
    params.push(value)
    index += 1
  }

  if (values.tab !== 'all') {
    add('status = $$', values.tab === 'pending' ? 'Pending' : 'Closed')
  }

  if (values.dealerCode) add('customer_dealer_code ilike $$', `%${values.dealerCode}%`)
  if (values.dealerName) add('customer_name ilike $$', `%${values.dealerName}%`)
  if (values.region) add('region = $$', values.region)
  if (values.zone) add('zone = $$', values.zone)
  if (values.territory) add('territory = $$', values.territory)
  if (values.chatType) add('chat_type = $$', values.chatType)
  if (values.fromDate) add("(created_at at time zone 'Asia/Karachi')::date >= $$", values.fromDate)
  if (values.toDate) add("(created_at at time zone 'Asia/Karachi')::date <= $$", values.toDate)

  if (values.query) {
    // Search matches the ticket itself or any message in its thread.
    add(`(
      id ilike $$
      or subject ilike $$
      or preview ilike $$
      or customer_name ilike $$
      or customer_dealer_code ilike $$
      or exists (
        select 1 from public.support_ticket_messages m
        where m.ticket_id = public.support_tickets.id and m.body ilike $$
      )
    )`, `%${values.query}%`)
  }

  return {
    clause: conditions.length ? `where ${conditions.join(' and ')}` : '',
    params,
    nextIndex: index,
  }
}

async function readTicketCounts() {
  const result = await getPool().query(`
    select
      count(*)::int as all,
      count(*) filter (where status = 'Pending')::int as pending,
      count(*) filter (where status = 'Closed')::int as closed
    from public.support_tickets
    where ${VISIBLE_DEALER_SQL}
  `)

  const row = result.rows[0] ?? {}

  return {
    all: row.all ?? 0,
    pending: row.pending ?? 0,
    closed: row.closed ?? 0,
  }
}

async function readTicketFacets() {
  const result = await getPool().query(`
    select 'region' as facet, region as value from public.support_tickets
      where ${VISIBLE_DEALER_SQL} group by region
    union all
    select 'zone', zone from public.support_tickets
      where ${VISIBLE_DEALER_SQL} group by zone
    union all
    select 'territory', territory from public.support_tickets
      where ${VISIBLE_DEALER_SQL} group by territory
    union all
    select 'chatType', chat_type from public.support_tickets
      where ${VISIBLE_DEALER_SQL} group by chat_type
    order by 1, 2
  `)

  const facets = { regions: [], zones: [], territories: [], chatTypes: [] }
  const buckets = {
    region: facets.regions,
    zone: facets.zones,
    territory: facets.territories,
    chatType: facets.chatTypes,
  }

  for (const row of result.rows) {
    buckets[row.facet]?.push(row.value)
  }

  return facets
}

async function readAvailableTags() {
  const result = await getPool().query(
    'select name from public.support_tags order by sort_order asc, name asc',
  )

  return result.rows.map((row) => row.name)
}

/**
 * Returns everything the support workspace renders — the current page of
 * chats with their threads, the tab counts, the filter options and the tag
 * list — so the inbox never disagrees with its own headers.
 */
export async function getTicketsView({
  filters = EMPTY_TICKET_FILTERS,
  page = 1,
  pageSize,
} = {}) {
  const size = normalizeTicketPageSize(pageSize)
  const requestedPage = normalizeTicketPage(page)

  if (!hasDatabase()) {
    const store = getMemoryStore()
    const all = memoryTickets(store)
    const matching = applyTicketFilters(all, normalizeTicketFilters(filters))
    const paged = paginateTickets(matching, requestedPage, size)

    return {
      tickets: paged.rows,
      total: matching.length,
      page: paged.page,
      pageSize: size,
      counts: calculateTicketCounts(all),
      facets: collectTicketFacets(all),
      availableTags: store.tags
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((tag) => tag.name),
      syncedAt: new Date().toISOString(),
      source: 'memory',
    }
  }

  const { clause, params, nextIndex } = buildTicketFilterClause(filters)
  const countResult = await getPool().query(
    `select count(*)::int as total from public.support_tickets ${clause}`,
    params,
  )
  const total = countResult.rows[0]?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(requestedPage, lastPage)

  const pageResult = await getPool().query(
    `select ${ticketColumns}
     from public.support_tickets
     ${clause}
     order by created_at desc, id desc
     limit $${nextIndex} offset $${nextIndex + 1}`,
    [...params, size, (safePage - 1) * size],
  )

  const ids = pageResult.rows.map((row) => row.id)
  const [messageResult, tagResult, counts, facets, availableTags] = await Promise.all([
    ids.length
      ? getPool().query(
        `select ${messageColumns}
         from public.support_ticket_messages
         where ticket_id = any($1::text[])
         order by sent_at asc, id asc`,
        [ids],
      )
      : { rows: [] },
    ids.length
      ? getPool().query(
        `select ticket_id, tag from public.support_ticket_tags
         where ticket_id = any($1::text[]) order by tag asc`,
        [ids],
      )
      : { rows: [] },
    readTicketCounts(),
    readTicketFacets(),
    readAvailableTags(),
  ])

  const reference = new Date()
  const tickets = pageResult.rows.map((row) => mapTicketRow(row, {
    messages: messageResult.rows.filter((message) => message.ticket_id === row.id),
    tags: tagResult.rows.filter((link) => link.ticket_id === row.id).map((link) => link.tag),
    reference,
  }))

  return {
    tickets,
    total,
    page: safePage,
    pageSize: size,
    counts,
    facets,
    availableTags,
    syncedAt: new Date().toISOString(),
    source: 'database',
  }
}

export function emptyTicketsView(pageSize) {
  return {
    tickets: [],
    total: 0,
    page: 1,
    pageSize: normalizeTicketPageSize(pageSize),
    counts: { ...emptyTicketCounts },
    facets: { ...emptyTicketFacets },
    availableTags: [],
    syncedAt: new Date().toISOString(),
    source: 'unavailable',
  }
}

/** Drives the header bell on every page. */
export async function getPendingTicketCount() {
  if (!hasDatabase()) {
    return calculateTicketCounts(memoryTickets(getMemoryStore())).pending
  }

  const result = await getPool().query(
    `select count(*)::int as pending from public.support_tickets
     where status = 'Pending' and ${VISIBLE_DEALER_SQL}`,
  )

  return result.rows[0]?.pending ?? 0
}

/**
 * The pending chats behind the header bell, newest first — the same rows the
 * Customer Care inbox opens on, so the bell never announces answered work.
 */
export async function listPendingTicketNotices(limit = NOTIFICATION_LIMIT) {
  const toNotice = (row) => ({
    id: row.id,
    subject: row.subject,
    customerName: row.customer_name,
    createdAt: new Date(row.created_at).toISOString(),
  })

  if (!hasDatabase()) {
    const visible = visibleDealerCodes()

    return getMemoryStore().tickets
      .filter((row) => row.status === 'Pending' && visible.has(row.customer_dealer_code))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(toNotice)
  }

  const result = await getPool().query(
    `select id, subject, customer_name, created_at
     from public.support_tickets
     where status = 'Pending' and ${VISIBLE_DEALER_SQL}
     order by created_at desc, id desc
     limit $1`,
    [limit],
  )

  return result.rows.map(toNotice)
}

/**
 * Every conversation ever held with one dealer, newest first — the history panel
 * beside an open chat. Unlike the inbox this is not filtered by the current
 * search, so an agent can see past chats without disturbing their filters.
 */
export async function listDealerChatHistory(dealerCode) {
  const toEntry = (row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    chatType: row.chat_type ?? row.chatType,
    createdAt: new Date(row.created_at).toISOString(),
  })

  if (!hasDatabase()) {
    return getMemoryStore().tickets
      .filter((row) => row.customer_dealer_code === dealerCode)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(toEntry)
  }

  const result = await getPool().query(
    `select id, subject, status, chat_type, created_at
     from public.support_tickets
     where customer_dealer_code = $1
     order by created_at desc, id desc`,
    [dealerCode],
  )

  return result.rows.map(toEntry)
}

/**
 * Opens a fresh conversation with a dealer who already has one. Customer details
 * are read from the dealer record rather than copied off the previous chat, so a
 * new thread never carries stale contact information forward.
 */
export async function createDealerChat({ dealerCode, subject, chatType, message }, agent = '') {
  if (!hasDatabase()) {
    const error = new Error('Starting a chat requires a database connection.')
    error.code = 'NO_DATABASE'
    throw error
  }

  const dealerResult = await getPool().query(
    `select code, name, region, zone, territory, email, status, verified
     from public.dealers where code = $1`,
    [dealerCode],
  )
  const dealer = dealerResult.rows[0]

  if (!dealer) {
    return { error: 'Dealer account not found.', status: 404 }
  }

  if (!dealer.verified || dealer.status !== 'Active') {
    return {
      error: 'Chats can only be started with a verified, active dealer.',
      status: 409,
    }
  }

  // Ids are TKT-000123; take the next one after the highest in use.
  const nextResult = await getPool().query(
    `select coalesce(max(substring(id from 5)::int), 0) + 1 as next
     from public.support_tickets`,
  )
  const id = `TKT-${String(nextResult.rows[0].next).padStart(6, '0')}`

  const inserted = await getPool().query(`
    insert into public.support_tickets (
      id, subject, chat_type, region, zone, territory, assigned_to, preview,
      customer_name, customer_dealer_code, customer_location, customer_phone,
      customer_email
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    returning ${ticketColumns}
  `, [
    id,
    subject,
    chatType,
    dealer.region,
    dealer.zone,
    dealer.territory,
    agent || 'Unassigned',
    message ?? '',
    dealer.name,
    dealer.code,
    `${dealer.region}, ${dealer.zone}, ${dealer.territory}`,
    '',
    dealer.email ?? '',
  ])

  if (message) {
    await addTicketMessage(id, message, 'agent')
  }

  return { ticket: mapTicketRow(inserted.rows[0], { messages: [], tags: [] }) }
}

/**
 * Appends a message, optionally carrying one already-uploaded attachment.
 *
 * `attachment` is `{ path, name, type, size }` — the object is in the bucket by
 * the time this runs, so a failed insert leaves a stray object rather than a row
 * pointing at nothing. The caller removes it.
 */
export async function addTicketMessage(ticketId, body, sender = 'agent', attachment = null) {
  if (!hasDatabase()) {
    const store = getMemoryStore()

    if (!store.tickets.some((ticket) => ticket.id === ticketId)) {
      return null
    }

    const message = {
      id: store.messages.reduce((max, row) => Math.max(max, row.id), 0) + 1,
      ticket_id: ticketId,
      sender,
      body,
      sent_at: new Date().toISOString(),
      attachment_path: attachment?.path ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_size: attachment?.size ?? null,
    }
    store.messages.push(message)
    return message
  }

  const result = await getPool().query(
    `insert into public.support_ticket_messages (
       ticket_id, sender, body,
       attachment_path, attachment_name, attachment_type, attachment_size
     )
     values ($1, $2, $3, $4, $5, $6, $7)
     returning ${messageColumns}`,
    [
      ticketId,
      sender,
      body,
      attachment?.path ?? null,
      attachment?.name ?? null,
      attachment?.type ?? null,
      attachment?.size ?? null,
    ],
  )

  return result.rows[0] ?? null
}

/**
 * The stored object behind one message, or null when there is none.
 *
 * Scoped by ticket as well as message id so a guessed id cannot pull a file out
 * of a chat the caller was not reading.
 */
export async function getMessageAttachment(ticketId, messageId) {
  const id = Number(messageId)

  if (!Number.isInteger(id)) {
    return null
  }

  if (!hasDatabase()) {
    const found = getMemoryStore().messages.find(
      (row) => row.id === id && row.ticket_id === ticketId,
    )

    return found?.attachment_path ? found : null
  }

  const result = await getPool().query(
    `select attachment_path, attachment_name, attachment_type, attachment_size
     from public.support_ticket_messages
     where id = $1 and ticket_id = $2 and attachment_path is not null`,
    [id, ticketId],
  )

  return result.rows[0] ?? null
}

export async function setTicketStatus(ticketId, status) {
  const validation = validateTicketStatus(status)

  if (!validation.ok) {
    throw new Error(validation.error)
  }

  if (!hasDatabase()) {
    const store = getMemoryStore()
    const ticket = store.tickets.find((row) => row.id === ticketId)

    if (!ticket) {
      return null
    }

    ticket.status = validation.value
    return { ...ticket }
  }

  const result = await getPool().query(
    `update public.support_tickets
     set status = $2, updated_at = now()
     where id = $1
     returning ${ticketColumns}`,
    [ticketId, validation.value],
  )

  return result.rowCount ? result.rows[0] : null
}

/** Adds the tag when missing, removes it when present. Returns the new tag list. */
export async function toggleTicketTag(ticketId, tag) {
  if (!hasDatabase()) {
    const store = getMemoryStore()

    if (!store.tickets.some((row) => row.id === ticketId)) {
      return null
    }

    if (!store.tags.some((row) => row.name === tag)) {
      throw new Error(`Unsupported tag: ${tag}`)
    }

    const index = store.ticketTags.findIndex(
      (link) => link.ticket_id === ticketId && link.tag === tag,
    )

    if (index === -1) {
      store.ticketTags.push({ ticket_id: ticketId, tag })
    } else {
      store.ticketTags.splice(index, 1)
    }

    return store.ticketTags
      .filter((link) => link.ticket_id === ticketId)
      .map((link) => link.tag)
      .sort((a, b) => a.localeCompare(b))
  }

  const client = await getPool().connect()

  try {
    await client.query('begin')

    const ticket = await client.query(
      'select 1 from public.support_tickets where id = $1',
      [ticketId],
    )

    if (!ticket.rowCount) {
      await client.query('rollback')
      return null
    }

    const removed = await client.query(
      'delete from public.support_ticket_tags where ticket_id = $1 and tag = $2',
      [ticketId, tag],
    )

    if (!removed.rowCount) {
      await client.query(
        'insert into public.support_ticket_tags (ticket_id, tag) values ($1, $2)',
        [ticketId, tag],
      )
    }

    const result = await client.query(
      'select tag from public.support_ticket_tags where ticket_id = $1 order by tag asc',
      [ticketId],
    )

    await client.query('commit')
    return result.rows.map((row) => row.tag)
  } catch (error) {
    await client.query('rollback')

    if (error.code === '23503') {
      throw new Error(`Unsupported tag: ${tag}`, { cause: error })
    }

    throw error
  } finally {
    client.release()
  }
}
