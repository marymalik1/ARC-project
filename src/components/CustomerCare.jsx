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
  MessageSquarePlus,
  Paperclip,
  Phone,
  Search,
  Send,
  SlidersHorizontal,
  Smile,
  Tag,
  UserRoundCog,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ALLOWED_ATTACHMENT_TYPES,
  formatBytes,
  isImageAttachment,
  validateAttachment,
} from '../lib/attachments'
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

// A small fixed set rather than a picker library: support replies reach for the
// same handful of faces, and every entry is labelled so the grid is usable
// without seeing it.
const EMOJI = Object.freeze([
  ['🙂', 'Slightly smiling face'],
  ['😀', 'Grinning face'],
  ['😊', 'Smiling face with smiling eyes'],
  ['😅', 'Grinning face with sweat'],
  ['🙏', 'Folded hands'],
  ['👍', 'Thumbs up'],
  ['👌', 'OK hand'],
  ['👏', 'Clapping hands'],
  ['💪', 'Flexed biceps'],
  ['🤝', 'Handshake'],
  ['✅', 'Check mark'],
  ['❌', 'Cross mark'],
  ['⚠️', 'Warning'],
  ['❗', 'Exclamation mark'],
  ['❓', 'Question mark'],
  ['⏳', 'Hourglass'],
  ['📅', 'Calendar'],
  ['📎', 'Paperclip'],
  ['📞', 'Telephone'],
  ['📧', 'Email'],
  ['📄', 'Document'],
  ['🔧', 'Wrench'],
  ['🚜', 'Tractor'],
  ['🌱', 'Seedling'],
  ['😐', 'Neutral face'],
  ['😕', 'Confused face'],
  ['😢', 'Crying face'],
  ['🎉', 'Party popper'],
])

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

function MessageAttachment({ ticketId, attachment }) {
  const href = `/api/tickets/${ticketId}/attachments/${attachment.messageId}`

  if (isImageAttachment(attachment.type)) {
    return (
      <a className="message-attachment message-attachment--image" href={href} target="_blank" rel="noreferrer">
        <img src={href} alt={attachment.name} />
        <span>{attachment.name}</span>
      </a>
    )
  }

  return (
    <a className="message-attachment" href={href} target="_blank" rel="noreferrer">
      <Paperclip aria-hidden="true" />
      <span>
        <strong>{attachment.name}</strong>
        <small>{formatBytes(attachment.size)}</small>
      </span>
    </a>
  )
}

function MessageBubble({ ticketId, message }) {
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
          <span>
            {message.body}
            {message.attachment && (
              <MessageAttachment ticketId={ticketId} attachment={message.attachment} />
            )}
          </span>
          {message.sender === 'agent' && <CheckCheck aria-label="Delivered" />}
        </div>
      </div>
    </article>
  )
}

function Conversation({
  ticket,
  draft,
  attachment,
  sending = false,
  selectedTags,
  availableTags = [],
  onDraft,
  onAttach,
  onSend,
  onToggleTag,
  onNewChat,
}) {
  const [tagsOpen, setTagsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [copyNotice, setCopyNotice] = useState('')

  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const composerRef = useRef(null)
  // Where to put the caret once the inserted emoji has been rendered.
  const caretRef = useRef(null)

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.key === 'Escape') {
        setTagsOpen(false)
        setMoreOpen(false)
        setEmojiOpen(false)
      }
    }

    window.addEventListener('keydown', closeMenus)
    return () => window.removeEventListener('keydown', closeMenus)
  }, [])

  useEffect(() => {
    if (!emojiOpen) {
      return undefined
    }

    const closeOnOutsideClick = (event) => {
      if (!composerRef.current?.contains(event.target)) {
        setEmojiOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [emojiOpen])

  // Runs after every render, but only acts on the one that follows an insert.
  useEffect(() => {
    if (caretRef.current === null) {
      return
    }

    const position = caretRef.current
    caretRef.current = null
    inputRef.current?.focus()
    inputRef.current?.setSelectionRange(position, position)
  })

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

  // Inserted where the caret is rather than appended, so an emoji can go in the
  // middle of a sentence the agent has already typed.
  const insertEmoji = (emoji) => {
    const input = inputRef.current
    const start = input?.selectionStart ?? draft.length
    const end = input?.selectionEnd ?? draft.length

    caretRef.current = start + emoji.length
    onDraft(`${draft.slice(0, start)}${emoji}${draft.slice(end)}`)
  }

  const send = (event) => {
    setEmojiOpen(false)
    onSend(event)
  }

  const pickAttachment = (event) => {
    onAttach?.(event.target.files?.[0] ?? null)
    // Cleared so re-picking the same file after removing it still fires change.
    event.target.value = ''
  }

  const removeAttachment = () => {
    onAttach?.(null)
    // The chip and its button are gone after this, so focus has to land
    // somewhere deliberate rather than back on the document.
    inputRef.current?.focus()
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
          {/* Opens another thread with the same dealer rather than reusing this
              one for an unrelated issue. */}
          {onNewChat && (
            <button className="tag-button" type="button" onClick={onNewChat}>
              <MessageSquarePlus aria-hidden="true" />
              New Chat
            </button>
          )}
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
            <MessageBubble ticketId={ticket.id} message={message} key={message.id} />
          ))}
        </div>
      </div>

      {/* Read-only roles see the thread but get no composer. */}
      {onSend ? (
        <form className="message-composer" onSubmit={send} ref={composerRef}>
          <input
            ref={fileRef}
            className="visually-hidden"
            type="file"
            tabIndex={-1}
            accept={ALLOWED_ATTACHMENT_TYPES.join(',')}
            onChange={pickAttachment}
          />
          {/* Above the input row, where a staged file is expected to appear. */}
          {attachment && (
            <div className="attachment-chip">
              <Paperclip aria-hidden="true" />
              <span>{attachment.name}</span>
              <small>{formatBytes(attachment.size)}</small>
              <button type="button" aria-label="Remove attachment" onClick={removeAttachment}>
                <CircleX aria-hidden="true" />
              </button>
            </div>
          )}
          <button type="button" aria-label="Attach file" onClick={() => fileRef.current?.click()}>
            <Paperclip aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Add emoji"
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen(!emojiOpen)}
          >
            <Smile aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            aria-label="Message"
            placeholder="Type your message..."
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
          />
          <button className="send-button" type="submit" disabled={sending}>
            <Send aria-hidden="true" />
            <span>{sending ? 'Sending…' : 'Send'}</span>
          </button>
          {emojiOpen && (
            <div className="emoji-panel" aria-label="Emoji">
              {EMOJI.map(([emoji, label]) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={label}
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
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

function ChatHistory({ chats, activeId, onOpen }) {
  if (!chats.length) {
    return null
  }

  return (
    <DetailCard title={`Chat History (${chats.length})`}>
      <ul className="chat-history">
        {chats.map((chat) => (
          <li key={chat.id}>
            <button
              type="button"
              className={chat.id === activeId ? 'chat-history-item chat-history-item--active' : 'chat-history-item'}
              onClick={() => onOpen(chat.id)}
              aria-current={chat.id === activeId ? 'true' : undefined}
            >
              <span className="chat-history-subject">{chat.subject}</span>
              <span className="chat-history-meta">
                {chat.id}
                <span aria-hidden="true"> • </span>
                {new Date(chat.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
              <span className={`chat-history-status chat-history-status--${chat.status.toLowerCase()}`}>
                {chat.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </DetailCard>
  )
}

function DetailRail({ ticket, onStatus, history = [], onOpenChat }) {
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
      {/* Directly under the customer, not below Ticket Details — buried at the
          bottom of the rail it fell off the fold and went unnoticed. */}
      <ChatHistory chats={history} activeId={ticket.id} onOpen={onOpenChat} />
      <TicketDetails ticket={ticket} />
      <TicketActions onStatus={onStatus} />
    </aside>
  )
}

export default function CustomerCare({ initialView, notifications, user }) {
  const [selectedId, setSelectedId] = useState(initialView.tickets[0]?.id ?? '')
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [sending, setSending] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => ({ ...EMPTY_TICKET_FILTERS }))
  const [history, setHistory] = useState({ code: '', chats: [] })
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

  // The dealer's other conversations, refreshed whenever the open chat moves to
  // a different dealer.
  const dealerCode = selectedTicket?.customer?.dealerCode ?? ''

  useEffect(() => {
    if (!dealerCode) {
      return undefined
    }

    const controller = new AbortController()

    fetch(`/api/tickets/history?dealerCode=${encodeURIComponent(dealerCode)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : { chats: [] }))
      // Stored against the dealer it belongs to, so switching chats never shows
      // the previous dealer's history while the new lookup is still in flight.
      .then((body) => setHistory({ code: dealerCode, chats: body.chats ?? [] }))
      .catch(() => {
        // An aborted or failed lookup just leaves the panel empty.
      })

    return () => controller.abort()
  }, [dealerCode, view.syncedAt])

  const dealerHistory = history.code === dealerCode ? history.chats : []

  const openChat = (id) => {
    setSelectedId(id)

    // A history entry may sit outside the current filters, so narrow the inbox
    // to this dealer instead of leaving the selection pointing at nothing.
    if (!tickets.some((ticket) => ticket.id === id)) {
      patchFilters({ dealerCode })
    }
  }

  // One click opens the thread — no form. The date keeps several new chats with
  // the same dealer apart in the history list.
  const startNewChat = async () => {
    if (!dealerCode) {
      return
    }

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

    try {
      setError('')
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerCode,
          subject: `New chat · ${today}`,
          chatType: 'Other',
        }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to start this chat.')
      }

      setSelectedId(body.ticket.id)
      await refresh({ silent: true })
    } catch (chatError) {
      setError(chatError.message)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const result = validateMessage(draft)

    // A file on its own is a message; words alone still have to be words.
    if ((!result.ok && !attachment) || !selectedTicket) {
      return
    }

    try {
      setError('')
      setSending(true)

      // Multipart only when there is something to carry — a plain reply stays a
      // small JSON request.
      let request

      if (attachment) {
        const form = new FormData()
        form.set('body', draft.trim())
        form.set('file', attachment)
        request = { method: 'POST', body: form }
      } else {
        request = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: result.value }),
        }
      }

      const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, request)
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Unable to send this message.')
      }

      setDraft('')
      setAttachment(null)
      await refresh({ silent: true })
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setSending(false)
    }
  }

  const attachFile = (file) => {
    if (!file) {
      setAttachment(null)
      return
    }

    const check = validateAttachment(file)

    if (!check.ok) {
      setError(check.error)
      return
    }

    setError('')
    setAttachment(file)
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
              attachment={attachment}
              sending={sending}
              selectedTags={selectedTicket?.tags ?? []}
              availableTags={view.availableTags}
              onDraft={setDraft}
              onAttach={attachFile}
              onSend={canManage ? sendMessage : undefined}
              onToggleTag={canManage ? toggleTag : undefined}
              onNewChat={canManage && selectedTicket ? startNewChat : undefined}
            />
            <DetailRail
              ticket={selectedTicket}
              onStatus={canManage ? changeStatus : undefined}
              history={dealerHistory}
              onOpenChat={openChat}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
