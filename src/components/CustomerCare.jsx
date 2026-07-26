"use client"

import {
  CheckCheck,
  ChevronUp,
  CircleCheck,
  CircleUserRound,
  CircleX,
  Clock3,
  EllipsisVertical,
  Mail,
  Paperclip,
  Phone,
  Search,
  Send,
  SlidersHorizontal,
  Smile,
  UserRoundCog,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { filterTickets, updateTicketStatus, validateMessage } from '../lib/tickets'
import Header from './Header'
import Sidebar from './Sidebar'

function PriorityBadge({ value }) {
  return (
    <span className={`ticket-badge ticket-badge--${value.toLowerCase()}`}>
      {value}
    </span>
  )
}

function TicketList({ tickets, selectedId, query, onQuery, onSelect }) {
  return (
    <section className="ticket-list-panel" aria-label="Tickets">
      <div className="ticket-list-header">
        <h2>Tickets</h2>
        <div className="ticket-search-row">
          <label className="ticket-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search tickets..."
              value={query}
              onChange={(event) => onQuery(event.target.value)}
            />
          </label>
          <button className="ticket-filter-button" type="button" aria-label="Filter tickets">
            <SlidersHorizontal />
          </button>
        </div>
      </div>

      <div className="ticket-items">
        {tickets.map((ticket) => (
          <button
            className={`ticket-item ${ticket.id === selectedId ? 'ticket-item--selected' : ''}`}
            type="button"
            key={ticket.id}
            onClick={() => onSelect(ticket.id)}
            aria-label={`${ticket.id}, ${ticket.customer.name}`}
          >
            <span className="ticket-item-top">
              <strong>{ticket.id}</strong>
              <PriorityBadge value={ticket.priority} />
              <time>{ticket.listTime}</time>
            </span>
            <span className="ticket-customer">{ticket.customer.name}</span>
            <span className="ticket-preview">{ticket.preview}</span>
          </button>
        ))}
        {tickets.length === 0 && (
          <p className="ticket-empty">No tickets match your search.</p>
        )}
      </div>

      <div className="ticket-list-footer">
        <p>Showing 1 to 5 of 320 tickets</p>
        <div className="ticket-pagination" aria-label="Ticket pages">
          <button className="active" type="button">1</button>
          <button type="button">2</button>
          <button type="button">3</button>
          <span>...</span>
          <button type="button">64</button>
        </div>
      </div>
    </section>
  )
}

function Conversation({ ticket, draft, onDraft, onSend, onStatus }) {
  return (
    <section className="conversation-panel" aria-label={`Conversation for ${ticket.id}`}>
      <header className="conversation-header">
        <div>
          <div className="conversation-title">
            <h2>{ticket.id}</h2>
            <PriorityBadge value={ticket.priority} />
          </div>
          <p>{ticket.customer.name}</p>
        </div>
        <div className="conversation-header-actions">
          <button className="outline-red-button close-ticket-top" type="button" onClick={() => onStatus('Closed')}>
            Close Ticket
          </button>
          <button className="kebab-button" type="button" aria-label="More ticket actions">
            <EllipsisVertical />
          </button>
        </div>
      </header>

      <div className="conversation-body">
        <time className="conversation-date">18 May 2025</time>
        <div className="message-stack" aria-live="polite">
          {ticket.messages.map((message) => (
            <article className={`message-row message-row--${message.sender}`} key={message.id}>
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
          ))}
        </div>
      </div>

      <form className="message-composer" onSubmit={onSend}>
        <button type="button" aria-label="Attach file"><Paperclip /></button>
        <button type="button" aria-label="Add emoji"><Smile /></button>
        <input
          placeholder="Type your message..."
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
        />
        <button className="send-button" type="submit">
          <Send />
          <span>Send</span>
        </button>
      </form>
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

function TicketDetails({ ticket, onStatus }) {
  return (
    <aside className="ticket-details-rail" aria-label="Ticket information">
      <DetailCard title="Customer Details">
        <div className="customer-details-body">
          <div className="customer-summary">
            <span className="customer-icon"><UserRoundCog /></span>
            <div>
              <strong>{ticket.customer.name}</strong>
              <span>{ticket.customer.dealerCode}</span>
              <span>{ticket.customer.location}</span>
            </div>
          </div>
          <a href={`tel:${ticket.customer.phone.replaceAll('-', '')}`}>
            <Phone /> {ticket.customer.phone}
          </a>
          <a href={`mailto:${ticket.customer.email}`}>
            <Mail /> {ticket.customer.email}
          </a>
        </div>
      </DetailCard>

      <DetailCard title="Ticket Details">
        <dl className="ticket-detail-list">
          <div><dt>Ticket ID</dt><dd>{ticket.id}</dd></div>
          <div>
            <dt>Status</dt>
            <dd><span className={`detail-status detail-status--${ticket.status.toLowerCase()}`}>{ticket.status}</span></dd>
          </div>
          <div><dt>Priority</dt><dd><PriorityBadge value={ticket.priority} /></dd></div>
          <div><dt>Created On</dt><dd>{ticket.createdOn}</dd></div>
          <div><dt>Channel</dt><dd>{ticket.channel}</dd></div>
          <div><dt>Assigned To</dt><dd>{ticket.assignedTo}</dd></div>
        </dl>
        <button className="outline-red-button reassign-button" type="button">Reassign Ticket</button>
      </DetailCard>

      <DetailCard title="Actions">
        <div className="ticket-action-list">
          <button type="button" onClick={() => onStatus('Pending')}>
            <Clock3 /> <span>Mark as Pending</span>
          </button>
          <button className="resolve-action" type="button" onClick={() => onStatus('Resolved')}>
            <CircleCheck /> <span>Resolve Ticket</span>
          </button>
          <button className="close-action" type="button" onClick={() => onStatus('Closed')}>
            <CircleX /> <span>Close Ticket</span>
          </button>
        </div>
      </DetailCard>
    </aside>
  )
}

export default function CustomerCare({ initialTickets }) {
  const [tickets, setTickets] = useState(() => initialTickets)
  const [selectedId, setSelectedId] = useState(initialTickets[0].id)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleTickets = useMemo(
    () => filterTickets(tickets, query),
    [tickets, query],
  )
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0]

  const sendMessage = (event) => {
    event.preventDefault()
    const result = validateMessage(draft)

    if (!result.ok) {
      return
    }

    setTickets((current) => current.map((ticket) => (
      ticket.id === selectedId
        ? {
            ...ticket,
            messages: [
              ...ticket.messages,
              {
                id: `message-${Date.now()}`,
                sender: 'agent',
                time: '10:36 AM',
                body: result.value,
              },
            ],
          }
        : ticket
    )))
    setDraft('')
  }

  const changeStatus = (status) => {
    setTickets((current) => updateTicketStatus(current, selectedId, status))
  }

  return (
    <div className="app-shell customer-care-shell">
      <Sidebar
        activePage="customer-care"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-shell">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="customer-care-content">
          <div className="page-heading customer-care-heading">
            <h1>Customer Care</h1>
            <div className="breadcrumb" aria-label="Breadcrumb">
              <span>Home</span>
              <span aria-hidden="true">›</span>
              <strong>Customer Care</strong>
            </div>
          </div>

          <div className="support-workspace">
            <TicketList
              tickets={visibleTickets}
              selectedId={selectedId}
              query={query}
              onQuery={setQuery}
              onSelect={setSelectedId}
            />
            <Conversation
              ticket={selectedTicket}
              draft={draft}
              onDraft={setDraft}
              onSend={sendMessage}
              onStatus={changeStatus}
            />
            <TicketDetails ticket={selectedTicket} onStatus={changeStatus} />
          </div>
        </main>
      </div>
    </div>
  )
}
