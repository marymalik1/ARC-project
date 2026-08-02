"use client"

import {
  CalendarDays,
  CheckCheck,
  ChevronUp,
  CircleUserRound,
  CircleX,
  Clock3,
  Download,
  EllipsisVertical,
  Mail,
  Paperclip,
  Phone,
  Search,
  Send,
  SlidersHorizontal,
  Smile,
  Tag,
  UserRoundCog,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildPageItems } from '../lib/pagination'
import { CAPABILITIES, can } from '../lib/permissions'
import {
  EMPTY_TICKET_FILTERS,
  emptyTicketCounts,
  emptyTicketFacets,
  ticketTotalPages,
  ticketsToCsv,
  validateMessage,
} from '../lib/tickets'
import { useTicketView } from '../lib/use-ticket-view'
import Header from './Header'
import { useShell } from './ShellState'
import Sidebar from './Sidebar'
import SyncStatus from './SyncStatus'

function PriorityBadge({ value }) {
  return (
    <span className={`ticket-badge ticket-badge--${value.toLowerCase()}`}>
      {value}
    </span>
  )
}

function FilterSelect({ label, name, value, options, allLabel, onChange }) {
  return (
    <label className="support-filter-field">
      <span>{label}</span>
      <select
        aria-label={label}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function DateFilter({ label, name, value, placeholder, onChange }) {
  return (
    <label className="support-filter-field">
      <span>{label}</span>
      <span className="date-filter-control">
        <CalendarDays aria-hidden="true" />
        <input
          aria-label={label}
          type={value ? 'date' : 'text'}
          value={value}
          placeholder={placeholder}
          onFocus={(event) => {
            event.currentTarget.type = 'date'
            event.currentTarget.showPicker?.()
          }}
          onBlur={(event) => {
            if (!event.currentTarget.value) {
              event.currentTarget.type = 'text'
            }
          }}
          onChange={(event) => onChange(name, event.target.value)}
        />
      </span>
    </label>
  )
}

function SupportFilters({
  filters,
  facets = emptyTicketFacets,
  exportHref,
  onChange,
  onApply,
  onClear,
}) {
  return (
    <form className="support-filters" onSubmit={onApply}>
      <label className="support-filter-field">
        <span>Dealer Code</span>
        <input
          aria-label="Dealer Code"
          value={filters.dealerCode}
          onChange={(event) => onChange('dealerCode', event.target.value)}
          placeholder="Enter dealer code"
        />
      </label>
      <label className="support-filter-field">
        <span>Dealer Name</span>
        <input
          aria-label="Dealer Name"
          value={filters.dealerName}
          onChange={(event) => onChange('dealerName', event.target.value)}
          placeholder="Enter dealer name"
        />
      </label>
      <FilterSelect
        label="Region"
        name="region"
        value={filters.region}
        options={facets.regions}
        allLabel="All Regions"
        onChange={onChange}
      />
      <FilterSelect
        label="Zone"
        name="zone"
        value={filters.zone}
        options={facets.zones}
        allLabel="All Zones"
        onChange={onChange}
      />
      <FilterSelect
        label="Territory"
        name="territory"
        value={filters.territory}
        options={facets.territories}
        allLabel="All Territories"
        onChange={onChange}
      />
      <FilterSelect
        label="Chat Type"
        name="chatType"
        value={filters.chatType}
        options={facets.chatTypes}
        allLabel="All Types"
        onChange={onChange}
      />
      <DateFilter
        label="From Date"
        name="fromDate"
        value={filters.fromDate}
        placeholder="Select from date"
        onChange={onChange}
      />
      <DateFilter
        label="To Date"
        name="toDate"
        value={filters.toDate}
        placeholder="Select to date"
        onChange={onChange}
      />
      <div className="support-filter-actions">
        <button className="filter-clear-button" type="button" onClick={onClear}>
          <SlidersHorizontal aria-hidden="true" />
          Clear Filters
        </button>
        <button className="filter-search-button" type="submit">
          <Search aria-hidden="true" />
          Search
        </button>
        <a
          className="filter-export-button"
          href={exportHref}
          download="customer-care-tickets.csv"
        >
          <Download aria-hidden="true" />
          Export
        </a>
      </div>
    </form>
  )
}

function ChatTabs({ activeTab, counts = emptyTicketCounts, onTab }) {
  return (
    <div className="chat-tabs" role="tablist" aria-label="Chat status">
      {[
        ['all', `Chats (${counts.all})`],
        ['pending', `Pending (${counts.pending})`],
        ['closed', `Closed (${counts.closed})`],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={activeTab === value}
          className={activeTab === value ? 'chat-tab chat-tab--active' : 'chat-tab'}
          onClick={() => onTab(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function ChatListItem({ ticket, selected, onSelect }) {
  return (
    <button
      className={selected ? 'ticket-item ticket-item--selected' : 'ticket-item'}
      type="button"
      onClick={() => onSelect(ticket.id)}
      aria-label={`${ticket.subject}, ${ticket.id}, ${ticket.customer.name}`}
    >
      <span className="ticket-item-copy">
        <strong>{ticket.subject}</strong>
        <span>{ticket.id} <i aria-hidden="true">•</i> {ticket.customer.name}</span>
      </span>
      <span className="ticket-item-meta">
        <time>{ticket.listTime}</time>
        <span className={`chat-status chat-status--${ticket.status.toLowerCase()}`}>
          {ticket.status}
        </span>
      </span>
    </button>
  )
}

function ChatInbox({
  tickets,
  selectedId,
  query,
  activeTab,
  counts,
  total = tickets.length,
  page = 1,
  pageSize = tickets.length || 1,
  onQuery,
  onTab,
  onSelect,
  onPage = () => {},
}) {
  const lastPage = ticketTotalPages(total, pageSize)
  const firstEntry = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastEntry = Math.min(page * pageSize, total)

  return (
    <section className="chat-inbox" aria-label="Chats">
      <ChatTabs activeTab={activeTab} counts={counts} onTab={onTab} />

      <div className="chat-search-row">
        <label className="chat-search">
          <Search aria-hidden="true" />
          <input
            aria-label="Search chats"
            type="search"
            placeholder="Search chats..."
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <button className="chat-filter-button" type="button" aria-label="Filter chats">
          <SlidersHorizontal aria-hidden="true" />
        </button>
      </div>

      <div className="ticket-items" aria-live="polite">
        {tickets.map((ticket) => (
          <ChatListItem
            ticket={ticket}
            selected={ticket.id === selectedId}
            onSelect={onSelect}
            key={ticket.id}
          />
        ))}
        {tickets.length === 0 && (
          <div className="ticket-empty">
            <strong>No chats found</strong>
            <span>Try changing your search or filters.</span>
          </div>
        )}
      </div>

      <footer className="ticket-list-footer">
        <p aria-live="polite">
          Showing {firstEntry} to {lastEntry} of {total} chats
        </p>
        <nav className="ticket-pagination" aria-label="Chat pages">
          {buildPageItems(page, lastPage).map((item) => item.ellipsis ? (
            <span aria-hidden="true" key={item.key}>…</span>
          ) : (
            <button
              className={item.page === page ? 'active' : ''}
              type="button"
              aria-current={item.page === page ? 'page' : undefined}
              onClick={() => onPage(item.page)}
              key={item.key}
            >
              {item.page}
            </button>
          ))}
        </nav>
      </footer>
    </section>
  )
}

function MessageBubble({ message }) {
  return (
    <article className={`message-row message-row--${message.sender}`}>
      {message.sender === 'customer' && (
        <span className="message-avatar" aria-hidden="true">
          <CircleUserRound />
        </span>
      )}
      <div className="message-content">
        <time>{message.time}</time>
        <div className="message-bubble">
          <span>{message.body}</span>
          {message.sender === 'agent' && <CheckCheck aria-label="Delivered" />}
        </div>
      </div>
    </article>
  )
}

function Conversation({
  ticket,
  draft,
  selectedTags,
  availableTags = [],
  onDraft,
  onSend,
  onToggleTag,
}) {
  const [tagsOpen, setTagsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copyNotice, setCopyNotice] = useState('')

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.key === 'Escape') {
        setTagsOpen(false)
        setMoreOpen(false)
      }
    }

    window.addEventListener('keydown', closeMenus)
    return () => window.removeEventListener('keydown', closeMenus)
  }, [])

  if (!ticket) {
    return (
      <section className="conversation-panel conversation-panel--empty">
        <strong>Select a chat to view the conversation</strong>
      </section>
    )
  }

  const copyTicketId = async () => {
    try {
      await window.navigator.clipboard.writeText(ticket.id)
      setCopyNotice('Ticket ID copied')
    } catch {
      setCopyNotice('Copy unavailable')
    }
    setMoreOpen(false)
  }

  return (
    <section className="conversation-panel" aria-label={`Conversation for ${ticket.id}`}>
      <header className="conversation-header">
        <div className="conversation-heading-copy">
          <h2>{ticket.subject}</h2>
          <p>{ticket.id} <span aria-hidden="true">•</span> {ticket.customer.name}</p>
          {selectedTags.length > 0 && (
            <div className="selected-tags" aria-label="Selected tags">
              {selectedTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
        </div>
        <div className="conversation-header-actions">
          <div className="conversation-action-wrap">
            <button
              className="tag-button"
              type="button"
              aria-expanded={tagsOpen}
              onClick={() => {
                setTagsOpen((open) => !open)
                setMoreOpen(false)
              }}
            >
              <Tag aria-hidden="true" />
              Tags
            </button>
            {tagsOpen && (
              <div className="tag-menu" role="menu" aria-label="Ticket tags">
                {availableTags.map((tag) => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag)}
                      onChange={() => onToggleTag(tag)}
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="conversation-action-wrap">
            <button
              className="kebab-button"
              type="button"
              aria-label="More chat actions"
              aria-expanded={moreOpen}
              onClick={() => {
                setMoreOpen((open) => !open)
                setTagsOpen(false)
              }}
            >
              <EllipsisVertical aria-hidden="true" />
            </button>
            {moreOpen && (
              <div className="conversation-menu" role="menu">
                <button type="button" role="menuitem" onClick={copyTicketId}>
                  Copy ticket ID
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleTag('Follow Up')
                    setMoreOpen(false)
                  }}
                >
                  Flag for follow up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <p className="copy-notice" aria-live="polite">{copyNotice}</p>

      <div className="conversation-body">
        <time className="conversation-date">{ticket.createdOn.split(',')[0]}</time>
        <div className="message-stack" aria-live="polite">
          {ticket.messages.map((message) => (
            <MessageBubble message={message} key={message.id} />
          ))}
        </div>
      </div>

      {/* Read-only roles see the thread but get no composer. */}
      {onSend ? (
        <form className="message-composer" onSubmit={onSend}>
          <button type="button" aria-label="Attach file"><Paperclip aria-hidden="true" /></button>
          <button type="button" aria-label="Add emoji"><Smile aria-hidden="true" /></button>
          <input
            aria-label="Message"
            placeholder="Type your message..."
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
          />
          <button className="send-button" type="submit">
            <Send aria-hidden="true" />
            <span>Send</span>
          </button>
        </form>
      ) : (
        <p className="message-composer message-composer--readonly">
          Your role has read-only access to conversations.
        </p>
      )}
    </section>
  )
}

function DetailCard({ title, children }) {
  return (
    <section className="detail-card">
      <header>
        <h2>{title}</h2>
        <ChevronUp aria-hidden="true" />
      </header>
      {children}
    </section>
  )
}

function CustomerDetails({ ticket }) {
  return (
    <DetailCard title="Customer Details">
      <div className="customer-details-body">
        <div className="customer-summary">
          <span className="customer-icon"><UserRoundCog aria-hidden="true" /></span>
          <div>
            <strong>{ticket.customer.name}</strong>
            <span>{ticket.customer.dealerCode}</span>
            <span>{ticket.customer.location}</span>
          </div>
        </div>
        <a href={`tel:${ticket.customer.phone.replaceAll('-', '')}`}>
          <Phone aria-hidden="true" /> {ticket.customer.phone}
        </a>
        <a href={`mailto:${ticket.customer.email}`}>
          <Mail aria-hidden="true" /> {ticket.customer.email}
        </a>
      </div>
    </DetailCard>
  )
}

function TicketDetails({ ticket }) {
  return (
    <DetailCard title="Ticket Details">
      <dl className="ticket-detail-list">
        <div><dt>Ticket ID</dt><dd>{ticket.id}</dd></div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`detail-status detail-status--${ticket.status.toLowerCase()}`}>
              {ticket.status}
            </span>
          </dd>
        </div>
        <div><dt>Chat Type</dt><dd><span className="chat-type-badge">{ticket.chatType}</span></dd></div>
        <div><dt>Priority</dt><dd><PriorityBadge value={ticket.priority} /></dd></div>
        <div><dt>Created On</dt><dd>{ticket.createdOn}</dd></div>
        <div><dt>Channel</dt><dd>{ticket.channel}</dd></div>
        <div><dt>Assigned To</dt><dd>{ticket.assignedTo}</dd></div>
      </dl>
    </DetailCard>
  )
}

function TicketActions({ onStatus }) {
  if (!onStatus) {
    return null
  }

  return (
    <DetailCard title="Actions">
      <div className="ticket-action-list">
        <button type="button" onClick={() => onStatus('Pending')}>
          <Clock3 aria-hidden="true" />
          <span>Mark as Pending</span>
        </button>
        <button className="close-action" type="button" onClick={() => onStatus('Closed')}>
          <CircleX aria-hidden="true" />
          <span>Close Chat</span>
        </button>
      </div>
    </DetailCard>
  )
}

function DetailRail({ ticket, onStatus }) {
  if (!ticket) {
    return (
      <aside className="ticket-details-rail ticket-details-rail--empty">
        <strong>Select a chat to view customer details</strong>
      </aside>
    )
  }

  return (
    <aside className="ticket-details-rail" aria-label="Ticket information">
      <CustomerDetails ticket={ticket} />
      <TicketDetails ticket={ticket} />
      <TicketActions onStatus={onStatus} />
    </aside>
  )
}

export default function CustomerCare({ initialView, notifications, user }) {
  const [selectedId, setSelectedId] = useState(initialView.tickets[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const [draftFilters, setDraftFilters] = useState(() => ({ ...EMPTY_TICKET_FILTERS }))
  const { collapsed, drawerOpen, animate, toggle, closeDrawer } = useShell()
  // Management can read conversations but not reply to or close them.
  const canManage = can(user, CAPABILITIES.CARE_MANAGE)

  const {
    view,
    appliedFilters,
    applyFilters: applyTicketQuery,
    patchFilters,
    goToPage,
    error,
    loading,
    refresh,
    setError,
  } = useTicketView({ initialView })

  const tickets = view.tickets
  const exportHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(ticketsToCsv(tickets))}`,
    [tickets],
  )
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId)
    ?? tickets[0]
    ?? null

  const updateDraftFilter = (name, value) => {
    setDraftFilters((current) => ({ ...current, [name]: value }))
  }

  const applyFilters = (event) => {
    event.preventDefault()
    applyTicketQuery(draftFilters)
  }

  const clearFilters = () => {
    const cleared = { ...EMPTY_TICKET_FILTERS }
    setDraftFilters(cleared)
    applyTicketQuery(cleared)
  }

  const switchTab = (tab) => {
    setDraftFilters((current) => ({ ...current, tab }))
    patchFilters({ tab })
  }

  const updateInboxQuery = (query) => {
    setDraftFilters((current) => ({ ...current, query }))
    patchFilters({ query })
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const result = validateMessage(draft)

    if (!result.ok || !selectedTicket) {
      return
    }

    try {
      setError('')
      const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: result.value }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to send this message.')
      }

      setDraft('')
      await refresh({ silent: true })
    } catch (sendError) {
      setError(sendError.message)
    }
  }

  const changeStatus = async (status) => {
    if (!selectedTicket) {
      return
    }

    try {
      setError('')
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to update this chat.')
      }

      await refresh({ silent: true })
    } catch (statusError) {
      setError(statusError.message)
    }
  }

  const toggleTag = async (tag) => {
    if (!selectedTicket) {
      return
    }

    try {
      setError('')
      const response = await fetch(`/api/tickets/${selectedTicket.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to update these tags.')
      }

      await refresh({ silent: true })
    } catch (tagError) {
      setError(tagError.message)
    }
  }

  return (
    <div
      className={`app-shell customer-care-shell ${collapsed ? 'app-shell--rail' : ''} ${animate ? 'app-shell--animate' : ''}`}
    >
      <Sidebar
        activePage="customer-care"
        open={drawerOpen}
        onClose={closeDrawer}
        user={user}
      />
      <div className="main-shell">
        <Header
          onMenu={toggle}
          menuExpanded={!collapsed}
          notifications={view.counts?.pending ?? notifications}
          user={user}
        />
        <main className="customer-care-content">
          <div className="page-heading customer-care-heading">
            <h1>Customer Care</h1>
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span>Home</span>
              <span aria-hidden="true">›</span>
              <strong>Customer Care</strong>
              <SyncStatus syncedAt={view.syncedAt} loading={loading} />
            </div>
          </div>

          <SupportFilters
            filters={draftFilters}
            facets={view.facets}
            exportHref={exportHref}
            onChange={updateDraftFilter}
            onApply={applyFilters}
            onClear={clearFilters}
          />

          <p className="request-error" role="alert" aria-live="polite">{error}</p>

          <div className="support-workspace">
            <ChatInbox
              tickets={tickets}
              selectedId={selectedTicket?.id ?? ''}
              query={appliedFilters.query}
              activeTab={appliedFilters.tab}
              counts={view.counts}
              total={view.total}
              page={view.page}
              pageSize={view.pageSize}
              onQuery={updateInboxQuery}
              onTab={switchTab}
              onSelect={setSelectedId}
              onPage={goToPage}
            />
            <Conversation
              ticket={selectedTicket}
              draft={draft}
              selectedTags={selectedTicket?.tags ?? []}
              availableTags={view.availableTags}
              onDraft={setDraft}
              onSend={canManage ? sendMessage : undefined}
              onToggleTag={canManage ? toggleTag : undefined}
            />
            <DetailRail ticket={selectedTicket} onStatus={canManage ? changeStatus : undefined} />
          </div>
        </main>
      </div>
    </div>
  )
}
