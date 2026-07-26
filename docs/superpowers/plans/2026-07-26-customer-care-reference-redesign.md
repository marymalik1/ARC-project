# Customer Care Reference Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/customer-care` to closely match the supplied Customer Care reference, keep its primary support interactions functional, and preserve a responsive ARC application shell.

**Architecture:** Keep page state in the existing client-side `CustomerCare` feature and isolate deterministic filtering, CSV, validation, and status logic in `src/lib/tickets.js`. Reuse the current route, sidebar, header, Lucide icons, and ticket data module; organize the page into focused local components rather than adding a new state framework or backend.

**Tech Stack:** Next.js 16, React 19, JavaScript, Lucide React, Node test runner, existing Playwright test files, CSS.

## Global Constraints

- Work only on the existing `customercare` branch.
- Keep every change uncommitted.
- Do not commit, push, force-push, merge, create or switch branches, or modify `main`.
- Preserve the existing `Sidebar`, `Header`, authentication flow, and `/customer-care` route.
- Use the supplied screenshot at `/var/folders/0b/0jn3zdq93k51zwzdmrl6sqsw0000gn/T/codex-clipboard-856c0d0d-34be-4deb-b686-5d43773ed0d9.png` as the visual source of truth.
- Use `lucide-react` for interface icons; do not draw substitute icons or add image assets.
- Keep state local and use realistic mock ticket data; no backend or persistence work.
- Use the in-app Browser for interactive and visual verification.
- Do not run the Playwright CLI unless the user separately approves it.
- Finish with `/Users/zaid/Projects/ARC-project/design-qa.md` containing `final result: passed`.

---

## File Map

- Modify `src/lib/tickets.js`: deterministic text, field, date, status, and CSV helpers.
- Modify `tests/tickets.test.js`: unit coverage for filtering, status changes, validation, and CSV output.
- Modify `src/data/tickets.js`: reference-aligned customer-care records and inbox totals.
- Modify `src/components/CustomerCare.jsx`: filter panel, inbox tabs/list, conversation, details rail, actions, tags, and export.
- Modify `src/app/globals.css`: desktop reference layout and component styling.
- Modify `src/app/mobile.css`: compact mobile layout and touch-safe controls.
- Modify `tests/e2e/customer-care.spec.js`: browser behavior coverage matching the redesigned controls.
- Create `design-qa.md`: desktop/mobile comparison findings and final result.

---

### Task 1: Customer-care data contract and deterministic helpers

**Files:**

- Modify: `tests/tickets.test.js`
- Modify: `src/lib/tickets.js`

**Interfaces:**

- Consumes: ticket objects with `id`, `subject`, `status`, `priority`, `chatType`, `region`, `zone`, `territory`, `createdDate`, `preview`, `customer`, and `messages`.
- Produces: `EMPTY_TICKET_FILTERS`, `applyTicketFilters(tickets, filters)`, `filterTickets(tickets, query)`, `ticketsToCsv(tickets)`, `validateMessage(message)`, and `updateTicketStatus(tickets, ticketId, status)`.

- [ ] **Step 1: Replace the unit-test fixtures with the complete ticket shape**

Use two Pending tickets and one Closed ticket. Include a CSV-sensitive value such as `Khan, Associates` and messages that can be searched.

```js
const tickets = [
  {
    id: 'TKT-000321',
    subject: 'Unable to login to the ARC portal',
    status: 'Pending',
    priority: 'High',
    chatType: 'Login Issue',
    region: 'North',
    zone: 'North Zone',
    territory: 'Lahore City',
    createdDate: '2025-05-18',
    createdOn: '18 May 2025, 10:30 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Invalid credentials are shown.',
    customer: { name: 'Ali Traders', dealerCode: 'D00123' },
    messages: [{ body: 'The password reset link did not arrive.' }],
  },
  {
    id: 'TKT-000320',
    subject: 'Report not generating',
    status: 'Pending',
    priority: 'Medium',
    chatType: 'Report Issue',
    region: 'South',
    zone: 'South Zone',
    territory: 'Karachi South',
    createdDate: '2025-05-17',
    createdOn: '17 May 2025, 09:45 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Monthly report is unavailable.',
    customer: { name: 'Khan, Associates', dealerCode: 'D00124' },
    messages: [{ body: 'The report button keeps loading.' }],
  },
  {
    id: 'TKT-000317',
    subject: 'Export file is blank',
    status: 'Closed',
    priority: 'Low',
    chatType: 'Export Issue',
    region: 'West',
    zone: 'West Zone',
    territory: 'Peshawar City',
    createdDate: '2025-05-16',
    createdOn: '16 May 2025, 11:10 AM',
    channel: 'Portal',
    assignedTo: 'Maryam',
    preview: 'Downloaded file contains no rows.',
    customer: { name: 'Bilal & Sons', dealerCode: 'D00127' },
    messages: [{ body: 'The export has headers only.' }],
  },
]
```

- [ ] **Step 2: Write failing tests for full-text and structured filtering**

```js
test('filterTickets searches subjects, customer fields, previews, and messages', () => {
  assert.deepEqual(filterTickets(tickets, 'login').map(({ id }) => id), ['TKT-000321'])
  assert.deepEqual(filterTickets(tickets, 'D00124').map(({ id }) => id), ['TKT-000320'])
  assert.deepEqual(filterTickets(tickets, 'headers only').map(({ id }) => id), ['TKT-000317'])
})

test('applyTicketFilters combines tab, dealer, territory, type, and date filters', () => {
  assert.deepEqual(
    applyTicketFilters(tickets, {
      ...EMPTY_TICKET_FILTERS,
      tab: 'pending',
      dealerName: 'khan',
      region: 'South',
      zone: 'South Zone',
      territory: 'Karachi South',
      chatType: 'Report Issue',
      fromDate: '2025-05-17',
      toDate: '2025-05-17',
    }).map(({ id }) => id),
    ['TKT-000320'],
  )
  assert.deepEqual(
    applyTicketFilters(tickets, { ...EMPTY_TICKET_FILTERS, tab: 'closed' }).map(({ id }) => id),
    ['TKT-000317'],
  )
})
```

- [ ] **Step 3: Write the failing CSV test**

```js
test('ticketsToCsv exports headers and escapes commas', () => {
  const csv = ticketsToCsv([tickets[1]])
  assert.match(csv, /^Ticket ID,Subject,Dealer,Status,Chat Type,Priority,Created On,Channel,Assigned To/m)
  assert.match(csv, /"Khan, Associates"/)
  assert.match(csv, /TKT-000320,Report not generating/)
})
```

- [ ] **Step 4: Run the unit tests and verify the new imports fail**

Run:

```bash
npm test
```

Expected: FAIL because `EMPTY_TICKET_FILTERS`, `applyTicketFilters`, and `ticketsToCsv` are not exported yet.

- [ ] **Step 5: Implement filtering and CSV helpers**

Add these exports to `src/lib/tickets.js`, preserving `validateMessage` and `updateTicketStatus`:

```js
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
  if (!needle) return tickets

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

const csvCell = (value) => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function ticketsToCsv(tickets) {
  const headings = [
    'Ticket ID', 'Subject', 'Dealer', 'Status', 'Chat Type',
    'Priority', 'Created On', 'Channel', 'Assigned To',
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
  return [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}
```

- [ ] **Step 6: Keep ticket statuses aligned with the redesigned actions**

Set:

```js
const supportedStatuses = new Set(['Pending', 'Closed'])
```

Keep `updateTicketStatus` immutable and retain the current exception for unsupported values. Update the existing status test to use an allowed final state:

```js
test('updateTicketStatus changes only the selected ticket', () => {
  const updated = updateTicketStatus(tickets, 'TKT-000321', 'Closed')

  assert.equal(updated[0].status, 'Closed')
  assert.equal(updated[1], tickets[1])
  assert.equal(tickets[0].status, 'Pending')
})
```

- [ ] **Step 7: Run unit tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: branch is `customercare`; only intended files are modified or untracked. Do not stage or commit.

---

### Task 2: Reference-aligned ticket records

**Files:**

- Modify: `src/data/tickets.js`
- Modify: `tests/tickets.test.js`

**Interfaces:**

- Consumes: the ticket shape used by Task 1.
- Produces: `initialTickets` and `chatCountSummary` for `CustomerCare`.

- [ ] **Step 1: Write a failing ticket-data contract test**

Add:

```js
import { chatCountSummary, initialTickets } from '../src/data/tickets.js'

test('reference ticket data supplies the inbox and detail fields', () => {
  assert.deepEqual(chatCountSummary, { all: 320, pending: 82, closed: 238 })
  assert.deepEqual(
    initialTickets.map(({ id, subject, status }) => ({ id, subject, status })),
    [
      { id: 'TKT-000321', subject: 'Unable to login to the ARC portal', status: 'Pending' },
      { id: 'TKT-000320', subject: 'Report not generating', status: 'Pending' },
      { id: 'TKT-000319', subject: 'Incorrect ledger amount', status: 'Pending' },
      { id: 'TKT-000318', subject: 'Product expired on dashboard', status: 'Pending' },
      { id: 'TKT-000317', subject: 'Export file is blank', status: 'Closed' },
    ],
  )
  for (const ticket of initialTickets) {
    assert.ok(ticket.chatType)
    assert.ok(ticket.region)
    assert.ok(ticket.zone)
    assert.ok(ticket.territory)
    assert.match(ticket.createdDate, /^\d{4}-\d{2}-\d{2}$/)
  }
})
```

- [ ] **Step 2: Run the data contract test and verify failure**

Run:

```bash
npm test
```

Expected: FAIL because `chatCountSummary` and the required reference fields are missing.

- [ ] **Step 3: Rewrite the five ticket records to match the reference**

Start the module with:

```js
export const chatCountSummary = {
  all: 320,
  pending: 82,
  closed: 238,
}
```

For every record, provide `subject`, `status`, `priority`, `chatType`, `region`, `zone`, `territory`, `createdDate`, `createdOn`, `channel`, `assignedTo`, `preview`, `customer`, and `messages`. Use the exact five IDs, subjects, dealers, and statuses asserted above. Keep the first conversation text and customer details aligned with the reference:

```js
{
  id: 'TKT-000321',
  subject: 'Unable to login to the ARC portal',
  priority: 'High',
  status: 'Pending',
  chatType: 'Login Issue',
  region: 'North',
  zone: 'North Zone',
  territory: 'Lahore City',
  listTime: '10:30 AM',
  createdDate: '2025-05-18',
  createdOn: '18 May 2025, 10:30 AM',
  channel: 'Portal',
  assignedTo: 'Maryam',
  preview: 'Hello, I am unable to login to the ARC portal.',
  customer: {
    name: 'Ali Traders',
    dealerCode: 'D00123',
    location: 'Lahore, North Zone, Lahore City',
    phone: '0300-1234567',
    email: 'ali.traders@gmail.com',
  },
  messages: [
    { id: 'm-1', sender: 'customer', time: '10:30 AM', body: 'Hello, I am unable to login to the ARC portal. It shows invalid credentials.' },
    { id: 'm-2', sender: 'agent', time: '10:32 AM', body: "Hi Ali, I'm sorry you're facing this issue. Could you please confirm your registered email address?" },
    { id: 'm-3', sender: 'customer', time: '10:33 AM', body: 'ali.traders@gmail.com' },
    { id: 'm-4', sender: 'agent', time: '10:34 AM', body: "Thanks! Please try resetting your password. I've sent you a reset link on your email." },
    { id: 'm-5', sender: 'customer', time: '10:35 AM', body: 'It worked! Thank you so much.' },
  ],
}
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: `customercare` remains active and no files are staged.

---

### Task 3: Filter panel and functional chat inbox

**Files:**

- Modify: `tests/e2e/customer-care.spec.js`
- Modify: `src/components/CustomerCare.jsx`

**Interfaces:**

- Consumes: `EMPTY_TICKET_FILTERS`, `applyTicketFilters`, `initialTickets`, and `chatCountSummary`.
- Produces: `SupportFilters`, `ChatTabs`, `ChatListItem`, and `ChatInbox` local components plus page-level draft/applied filter state.

- [ ] **Step 1: Replace the navigation test with reference-structure assertions**

Use:

```js
test('opens the reference-aligned customer care workspace', async ({ page }) => {
  await page.goto('/customer-care')

  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
  await expect(page.getByLabel('Dealer Code')).toBeVisible()
  await expect(page.getByLabel('Dealer Name')).toBeVisible()
  await expect(page.getByLabel('Region')).toBeVisible()
  await expect(page.getByLabel('Zone')).toBeVisible()
  await expect(page.getByLabel('Territory')).toBeVisible()
  await expect(page.getByLabel('Chat Type')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Pending (82)' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()
  await expect(page.getByText('Customer Details')).toBeVisible()
})
```

- [ ] **Step 2: Add the filtering behavior test**

```js
test('applies and clears support filters and switches inbox tabs', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByLabel('Dealer Name').fill('Khan')
  await page.getByLabel('Chat Type').selectOption('Report Issue')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Report not generating').first()).toBeVisible()
  await expect(page.getByText('Unable to login to the ARC portal')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear Filters' }).click()
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Closed (238)' }).click()
  await expect(page.getByText('Export file is blank').first()).toBeVisible()
})
```

- [ ] **Step 3: Add local filter and inbox components**

Import the additional icons and helpers:

```js
import {
  Download,
  Search,
  SlidersHorizontal,
  Tag,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  applyTicketFilters,
  EMPTY_TICKET_FILTERS,
  ticketsToCsv,
  updateTicketStatus,
  validateMessage,
} from '../lib/tickets'
import { chatCountSummary } from '../data/tickets'
```

Implement this reusable select field:

```jsx
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
```

Use real `<select>` elements with these values:

```js
const filterOptions = {
  regions: ['North', 'South', 'Central', 'West'],
  zones: ['North Zone', 'South Zone', 'Central Zone', 'West Zone'],
  territories: ['Lahore City', 'Karachi South', 'Islamabad East', 'Sheikhupura', 'Peshawar City'],
  chatTypes: ['Login Issue', 'Report Issue', 'Ledger Issue', 'Product Issue', 'Export Issue'],
}
```

Render every filter and action explicitly:

```jsx
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
  <FilterSelect label="Region" name="region" value={filters.region} options={filterOptions.regions} allLabel="All Regions" onChange={onChange} />
  <FilterSelect label="Zone" name="zone" value={filters.zone} options={filterOptions.zones} allLabel="All Zones" onChange={onChange} />
  <FilterSelect label="Territory" name="territory" value={filters.territory} options={filterOptions.territories} allLabel="All Territories" onChange={onChange} />
  <FilterSelect label="Chat Type" name="chatType" value={filters.chatType} options={filterOptions.chatTypes} allLabel="All Types" onChange={onChange} />
  <label className="support-filter-field">
    <span>From Date</span>
    <input aria-label="From Date" type="date" value={filters.fromDate} onChange={(event) => onChange('fromDate', event.target.value)} />
  </label>
  <label className="support-filter-field">
    <span>To Date</span>
    <input aria-label="To Date" type="date" value={filters.toDate} onChange={(event) => onChange('toDate', event.target.value)} />
  </label>
  <div className="support-filter-actions">
    <button className="filter-clear-button" type="button" onClick={onClear}>
      <SlidersHorizontal aria-hidden="true" />
      Clear Filters
    </button>
    <button className="filter-search-button" type="submit">
      <Search aria-hidden="true" />
      Search
    </button>
    <button className="filter-export-button" type="button" onClick={onExport}>
      <Download aria-hidden="true" />
      Export
    </button>
  </div>
</form>
```

- [ ] **Step 4: Implement semantic tabs and inbox rows**

Render:

```jsx
<div className="chat-tabs" role="tablist" aria-label="Chat status">
  {[
    ['all', `Chats (${chatCountSummary.all})`],
    ['pending', `Pending (${chatCountSummary.pending})`],
    ['closed', `Closed (${chatCountSummary.closed})`],
  ].map(([value, label]) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={filters.tab === value}
      className={filters.tab === value ? 'chat-tab chat-tab--active' : 'chat-tab'}
      onClick={() => onTab(value)}
    >
      {label}
    </button>
  ))}
</div>
```

Every inbox row must show `subject`, `id`, dealer name, `listTime`, and a text status badge. Use a selected modifier class and a red left indicator. Render `No chats found` when the list is empty.

Add local pagination state and wire the visible reference controls:

```jsx
const [pageNumber, setPageNumber] = useState(1)

<nav className="ticket-pagination" aria-label="Chat pages">
  {[1, 2, 3].map((value) => (
    <button
      className={pageNumber === value ? 'active' : ''}
      type="button"
      aria-current={pageNumber === value ? 'page' : undefined}
      onClick={() => setPageNumber(value)}
      key={value}
    >
      {value}
    </button>
  ))}
  <span aria-hidden="true">…</span>
  <button
    className={pageNumber === 17 ? 'active' : ''}
    type="button"
    aria-current={pageNumber === 17 ? 'page' : undefined}
    onClick={() => setPageNumber(17)}
  >
    17
  </button>
</nav>
```

The five local demo rows remain visible while the selected pagination control changes; this preserves the reference pagination interaction without inventing 315 extra records.

- [ ] **Step 5: Wire draft filters, applied filters, tabs, and selected-ticket fallback**

Inside `CustomerCare`, use:

```js
const [draftFilters, setDraftFilters] = useState(() => ({ ...EMPTY_TICKET_FILTERS }))
const [appliedFilters, setAppliedFilters] = useState(() => ({ ...EMPTY_TICKET_FILTERS }))

const visibleTickets = useMemo(
  () => applyTicketFilters(tickets, appliedFilters),
  [tickets, appliedFilters],
)

const selectedTicket = visibleTickets.find(({ id }) => id === selectedId)
  ?? visibleTickets[0]
  ?? null
```

Applying copies draft filters into applied filters. Clearing resets both objects. Switching tabs updates the tab in both objects immediately. An effect keeps `selectedId` synchronized with the first visible ticket when necessary.

- [ ] **Step 6: Review the saved browser tests without executing Playwright CLI**

Run:

```bash
npx eslint tests/e2e/customer-care.spec.js src/components/CustomerCare.jsx
```

Expected: no ESLint errors. Do not run `npm run test:e2e` without separate approval.

- [ ] **Step 7: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: the intended files remain unstaged on `customercare`.

---

### Task 4: Conversation, detail rail, status actions, tags, and export

**Files:**

- Modify: `tests/e2e/customer-care.spec.js`
- Modify: `src/components/CustomerCare.jsx`

**Interfaces:**

- Consumes: active ticket, visible ticket collection, `ticketsToCsv`, `validateMessage`, and `updateTicketStatus`.
- Produces: `Conversation`, `MessageComposer`, `CustomerDetails`, `TicketDetails`, `TicketActions`, a functional local tag menu, and browser CSV download.

- [ ] **Step 1: Replace the message/status browser test with the redesigned behavior**

```js
test('selects a chat, sends a reply, and closes the conversation', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByText('Report not generating').first().click()
  await expect(page.getByRole('heading', { name: 'Report not generating' })).toBeVisible()

  await page.getByLabel('Message').fill('The report service is available now.')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('The report service is available now.')).toBeVisible()
  await expect(page.getByLabel('Message')).toHaveValue('')

  await page.getByRole('button', { name: 'Close Chat' }).click()
  await page.getByRole('tab', { name: 'Closed (238)' }).click()
  await page.getByText('Report not generating').first().click()
  await expect(page.getByText('Closed', { exact: true }).last()).toBeVisible()
})
```

- [ ] **Step 2: Add the export browser test**

```js
test('exports the visible support tickets as CSV', async ({ page }) => {
  await page.goto('/customer-care')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('customer-care-tickets.csv')
})
```

- [ ] **Step 3: Update the conversation header and message markup**

The header must use the subject as its heading and show ID plus dealer underneath:

```jsx
<header className="conversation-header">
  <div>
    <h2>{ticket.subject}</h2>
    <p>{ticket.id} <span aria-hidden="true">•</span> {ticket.customer.name}</p>
  </div>
  <div className="conversation-header-actions">
    <button
      className="tag-button"
      type="button"
      aria-expanded={tagsOpen}
      onClick={() => setTagsOpen((open) => !open)}
    >
      <Tag aria-hidden="true" />
      Tags
    </button>
    <button className="kebab-button" type="button" aria-label="More chat actions">
      <EllipsisVertical aria-hidden="true" />
    </button>
  </div>
</header>
```

Keep the centered date, alternating bubbles, timestamps, customer icon, and read indicator. Add `aria-label="Message"` to the composer input. Return a neutral `Select a chat to view the conversation` panel when `ticket` is null.

- [ ] **Step 4: Match the Customer Details, Ticket Details, and Actions content**

Ticket Details must include `Chat Type` between Status and Priority. Remove the reference-inconsistent Reassign and Resolve controls. Actions must be:

```jsx
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
```

Return a neutral details state when no ticket is selected.

- [ ] **Step 5: Implement local tags**

Use:

```js
const availableTags = ['Login Issue', 'High Priority', 'Follow Up']
const [tagsByTicket, setTagsByTicket] = useState({})
const [moreOpen, setMoreOpen] = useState(false)

const toggleTag = (tag) => {
  setTagsByTicket((current) => {
    const selected = current[selectedId] ?? []
    return {
      ...current,
      [selectedId]: selected.includes(tag)
        ? selected.filter((value) => value !== tag)
        : [...selected, tag],
    }
  })
}
```

Render the tag menu beside the Tags button with checkbox semantics and show chosen tags beneath the ticket metadata. Also make the overflow control expose two local actions:

```jsx
<button
  className="kebab-button"
  type="button"
  aria-label="More chat actions"
  aria-expanded={moreOpen}
  onClick={() => setMoreOpen((open) => !open)}
>
  <EllipsisVertical aria-hidden="true" />
</button>
{moreOpen && (
  <div className="conversation-menu" role="menu">
    <button
      type="button"
      role="menuitem"
      onClick={async () => {
        await navigator.clipboard.writeText(ticket.id)
        setMoreOpen(false)
      }}
    >
      Copy ticket ID
    </button>
    <button type="button" role="menuitem" onClick={() => {
      toggleTag('Follow Up')
      setMoreOpen(false)
    }}>
      Flag for follow up
    </button>
  </div>
)}
```

Close either menu on Escape:

```js
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
```

- [ ] **Step 6: Implement CSV export**

Use:

```js
const exportTickets = () => {
  const blob = new Blob([ticketsToCsv(visibleTickets)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'customer-care-tickets.csv'
  link.click()
  URL.revokeObjectURL(url)
}
```

The export contains the currently visible rows, including a header-only file when there are no matches.

- [ ] **Step 7: Run unit tests and focused lint**

Run:

```bash
npm test
npx eslint src/components/CustomerCare.jsx tests/e2e/customer-care.spec.js
```

Expected: unit tests pass and ESLint reports no errors.

- [ ] **Step 8: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: no staged files and no branch change.

---

### Task 5: Desktop visual match

**Files:**

- Modify: `src/app/globals.css`

**Interfaces:**

- Consumes: the class names introduced by Tasks 3 and 4.
- Produces: the desktop reference layout at the supplied screenshot proportions.

- [ ] **Step 1: Establish page and filter-card geometry**

Update the customer-care section with:

```css
.customer-care-content {
  min-width: 0;
  padding: 24px 28px 32px;
  background: #fbfbfb;
}

.support-filters {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 18px 28px;
  padding: 24px 28px;
  margin-bottom: 18px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
}

.support-filter-field {
  grid-column: span 2;
  display: grid;
  gap: 8px;
}

.support-filter-actions {
  grid-column: span 4;
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 14px;
}
```

Style labeled controls to 48px height, 14px text, `#dfdfdf` borders, white background, and 8px radius. Use `#e3121a` for the Search button and red accents.

- [ ] **Step 2: Build the three-column workspace geometry**

Use:

```css
.support-workspace {
  display: grid;
  grid-template-columns: minmax(300px, 0.92fr) minmax(520px, 1.72fr) minmax(270px, 0.88fr);
  gap: 14px;
  align-items: stretch;
  min-height: 760px;
}

.chat-inbox,
.conversation-panel,
.detail-card {
  background: #fff;
  border: 1px solid #e7e7e7;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
}
```

Ensure the inbox and conversation have the same overall height and the details rail keeps natural stacked card heights.

- [ ] **Step 3: Match inbox density and selected state**

Use 58px header tabs, 64px search area, approximately 92px chat rows, a 3px red selected indicator, `#fff5f5` selected background, compact red status badges, and 48px pagination controls. The active tab uses a 2px red underline.

- [ ] **Step 4: Match conversation spacing and bubbles**

Use:

```css
.conversation-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.conversation-body {
  min-height: 0;
  padding: 18px 30px 22px;
  overflow-y: auto;
}

.message-bubble {
  max-width: 430px;
  padding: 14px 18px;
  border-radius: 8px;
  background: #f1f1f1;
  color: #242424;
  line-height: 1.5;
}

.message-row--agent .message-bubble {
  background: #fde4e6;
}
```

Match the header border, tag button, centered date, avatar size, timestamps, and 68px composer height shown in the reference.

- [ ] **Step 5: Match the details rail**

Use 18px card headings, 14px detail labels, right-aligned values, pale status chips, a 64px customer icon tile, and full-width 44px action buttons. Keep the cards separated by 14px.

- [ ] **Step 6: Open the page in the in-app Browser and compare desktop structure**

Start the existing local development server with:

```bash
npm run dev
```

Open `/customer-care` in the in-app Browser at the reference aspect ratio. Verify:

- filter rows and button alignment;
- three-column widths;
- five visible inbox records;
- conversation header and bubble placement;
- all three details cards;
- no overlap, crop, or horizontal overflow.

Expected: the composition matches the supplied reference closely while remaining inside the ARC shell.

- [ ] **Step 7: Fix visible desktop mismatches and repeat comparison**

Adjust only the customer-care selectors in `globals.css`. Re-open the same state and viewport after each change until spacing, borders, typography, and proportions are visibly aligned.

- [ ] **Step 8: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: the branch is still `customercare` and changes remain unstaged.

---

### Task 6: Tablet/mobile layout and accessible interaction

**Files:**

- Modify: `src/app/mobile.css`
- Modify: `src/app/globals.css`
- Modify: `tests/e2e/customer-care.spec.js`

**Interfaces:**

- Consumes: the completed desktop Customer Care components.
- Produces: overflow-safe tablet/mobile layout, visible Logout control, accessible controls, and a saved mobile browser test.

- [ ] **Step 1: Add the mobile browser-test contract**

```js
test('keeps customer care and logout controls usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/customer-care')

  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible()
})
```

The `Open menu` name is the existing accessible label in `Header`; do not change the shared header copy.

- [ ] **Step 2: Add tablet behavior**

At widths below 1280px:

```css
.support-filters {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.support-filter-field {
  grid-column: span 2;
}

.support-filter-actions {
  grid-column: span 6;
}

.support-workspace {
  grid-template-columns: minmax(280px, 0.9fr) minmax(480px, 1.5fr);
}

.ticket-details-rail {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```

- [ ] **Step 3: Add mobile behavior**

At widths below 768px:

```css
.customer-care-content {
  padding: 18px 14px 28px;
}

.support-filters {
  grid-template-columns: 1fr;
  gap: 14px;
  padding: 18px 14px;
}

.support-filter-field,
.support-filter-actions {
  grid-column: 1;
}

.support-filter-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.filter-search-button {
  grid-column: 1 / -1;
  grid-row: 1;
}

.support-workspace,
.ticket-details-rail {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.chat-inbox,
.conversation-panel,
.ticket-details-rail {
  min-width: 0;
}

.conversation-panel {
  min-height: 680px;
}
```

Retain at least 44px target height for buttons and form controls. Wrap long metadata and messages with `overflow-wrap: anywhere`. Do not hide the inbox, conversation, details cards, or shell Logout link.

- [ ] **Step 4: Add focus and reduced-motion safeguards**

Add:

```css
.customer-care-content button:focus-visible,
.customer-care-content input:focus-visible,
.customer-care-content select:focus-visible,
.ticket-item:focus-visible {
  outline: 3px solid rgb(227 18 26 / 25%);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .customer-care-content *,
  .customer-care-content *::before,
  .customer-care-content *::after {
    scroll-behavior: auto;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Verify mobile behavior in the in-app Browser**

At 390×844:

- open `/customer-care`;
- apply and clear a filter;
- switch Pending and Closed tabs;
- select a chat;
- send a message;
- close the chat;
- open navigation and confirm Logout is visible;
- scan horizontally and confirm no page-level overflow.

Expected: every primary control remains reachable and readable.

- [ ] **Step 6: Run tests and lint that do not invoke Playwright CLI**

Run:

```bash
npm test
npx eslint src/lib/tickets.js src/data/tickets.js src/components/CustomerCare.jsx tests/tickets.test.js tests/e2e/customer-care.spec.js
```

Expected: unit tests pass and ESLint has no errors.

- [ ] **Step 7: Record the uncommitted checkpoint**

Run:

```bash
git diff --check
git status --short --branch
```

Expected: intended files only; no staged files.

---

### Task 7: Full verification and design QA record

**Files:**

- Create: `design-qa.md`
- Review: every file listed in the File Map

**Interfaces:**

- Consumes: the completed implementation and supplied screenshot.
- Produces: an evidence-based QA record with `final result: passed`.

- [ ] **Step 1: Run all non-Playwright project checks**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 2: Verify the desktop flow in the in-app Browser**

Use a desktop viewport matching the reference aspect ratio. Confirm:

- page title and breadcrumb;
- eight labeled filters and three actions;
- Pending active by default;
- five reference records;
- selected row styling;
- subject, ID, dealer, messages, customer details, and ticket details;
- Tags menu;
- message sending;
- Pending and Close Chat actions;
- CSV export.

- [ ] **Step 3: Perform a combined-image visual comparison**

Capture the implemented desktop state. Place that capture and the supplied reference in one combined comparison image, keeping both at the same viewport and state. Inspect:

- major column and card proportions;
- margins and gaps;
- text sizes and weights;
- border colors and radii;
- active red elements;
- bubble sizes and alignment;
- clipped or wrapped content.

Fix visible mismatches in the relevant CSS or component and repeat until no material discrepancy remains.

- [ ] **Step 4: Perform mobile visual and interaction QA**

At 390×844, repeat the primary workflow and verify:

- no horizontal scrolling;
- readable filters and tickets;
- visible message composer and actions;
- details stack correctly;
- navigation drawer exposes Logout;
- touch targets are at least 44px high.

- [ ] **Step 5: Write the QA record**

Create `design-qa.md` with this completed structure:

```markdown
# Customer Care Design QA

Reference: `/var/folders/0b/0jn3zdq93k51zwzdmrl6sqsw0000gn/T/codex-clipboard-856c0d0d-34be-4deb-b686-5d43773ed0d9.png`

## Desktop comparison

- Layout: passed
- Typography: passed
- Spacing and sizing: passed
- Colors, borders, and radii: passed
- Core interactions: passed

## Mobile verification

- Responsive stacking: passed
- Horizontal overflow: passed
- Touch targets: passed
- Logout visibility: passed
- Core interactions: passed

## Automated checks

- `npm test`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `git diff --check`: passed

final result: passed
```

Only write `passed` for checks that actually pass. If a check fails, fix the implementation and rerun it before completing this step.

- [ ] **Step 6: Perform the final Git safety audit**

Run:

```bash
git branch --show-current
git status --short --branch
git diff --stat
```

Expected:

- current branch is exactly `customercare`;
- all requested implementation, plan, specification, and QA files are uncommitted;
- no files are staged;
- no commit, push, merge, force-push, branch creation, or change to `main` occurred.
