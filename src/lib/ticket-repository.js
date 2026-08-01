import {
  initialMessageRows,
  initialTagRows,
  initialTicketRows,
} from '../data/tickets'
import { getPool, hasDatabase } from './database'
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
  return store.tickets.map((row) => mapTicketRow(row, {
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
  const conditions = []
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
    select 'region' as facet, region as value from public.support_tickets group by region
    union all
    select 'zone', zone from public.support_tickets group by zone
    union all
    select 'territory', territory from public.support_tickets group by territory
    union all
    select 'chatType', chat_type from public.support_tickets group by chat_type
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
        `select id, ticket_id, sender, body, sent_at
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
    "select count(*)::int as pending from public.support_tickets where status = 'Pending'",
  )

  return result.rows[0]?.pending ?? 0
}

export async function addTicketMessage(ticketId, body, sender = 'agent') {
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
    }
    store.messages.push(message)
    return message
  }

  const result = await getPool().query(
    `insert into public.support_ticket_messages (ticket_id, sender, body)
     values ($1, $2, $3)
     returning id, ticket_id, sender, body, sent_at`,
    [ticketId, sender, body],
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
