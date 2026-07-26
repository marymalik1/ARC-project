# Customer Care Reference Redesign

Date: 2026-07-26  
Branch: `customercare`  
Reference: `/var/folders/0b/0jn3zdq93k51zwzdmrl6sqsw0000gn/T/codex-clipboard-856c0d0d-34be-4deb-b686-5d43773ed0d9.png`

## Objective

Rebuild the existing `/customer-care` workspace so it closely matches the supplied Customer Care reference while preserving the ARC application shell, authentication flow, routing, and established visual tokens. The result must be responsive and provide working interactions for the page's primary customer-support workflow.

All work must remain uncommitted on the existing `customercare` branch. No commits, pushes, force-pushes, merges, branch creation, or changes to `main` are permitted.

## Scope

### In scope

- The Customer Care page inside the existing sidebar and header shell.
- A two-row customer-care filter panel.
- A three-column desktop workspace containing:
  - chat inbox;
  - active conversation;
  - customer, ticket, and action details.
- Responsive tablet and mobile layouts.
- Realistic mock ticket data aligned with the reference.
- Working filters, search, inbox tabs, ticket selection, message sending, ticket actions, tags, and CSV export.
- Automated behavioral tests and visual design QA.

### Out of scope

- Backend APIs, databases, or persistent server-side updates.
- New authentication behavior or changes to other routes.
- New pages beyond `/customer-care`.
- Deployment, pull requests, commits, or pushes.

## Existing Product Integration

The implementation will reuse:

- the existing `Sidebar` and `Header`;
- the existing authenticated route at `/customer-care`;
- current ARC colors, typography, and icon library;
- the existing customer-care data/state structure where practical;
- the current responsive application shell.

The redesign will not replace shared navigation or alter unrelated screens.

## Visual Design

### Page header

- Display `Customer Care` as the page title.
- Display the breadcrumb `Home › Customer Care`, with Customer Care emphasized in ARC red.
- Keep the page on a very light neutral background with white cards and subtle gray borders.

### Filter panel

Place a full-width bordered card below the breadcrumb.

Desktop row one:

1. Dealer Code text field
2. Dealer Name text field
3. Region select
4. Zone select
5. Territory select

Desktop row two:

1. Chat Type select
2. From Date input
3. To Date input
4. Clear Filters secondary action
5. Search primary red action
6. Export secondary action

Inputs use visible labels, restrained corner radii, dark text, and muted placeholders. The Search button is the strongest action, matching the red in the reference.

### Main support workspace

On wide screens, use three columns with proportions matching the reference:

- inbox: approximately 27%;
- conversation: approximately 49%;
- details rail: approximately 24%.

All three areas should align at the top, use white surfaces, subtle borders, and compact spacing.

### Chat inbox

Header tabs:

- `Chats (320)`
- `Pending (82)`
- `Closed (238)`

Pending is initially active and uses a red label and underline. A search field and compact filter control appear below the tabs.

Each row displays:

- subject;
- ticket ID;
- dealer/customer name;
- time or date;
- status badge.

The selected row uses a pale-red background and a red left border. Rows should match the reference subjects:

1. Unable to login to the ARC portal
2. Report not generating
3. Incorrect ledger amount
4. Product expired on dashboard
5. Export file is blank

The footer shows the visible result range and pagination controls styled like the reference.

### Conversation

The header displays:

- subject;
- ticket ID and dealer name;
- outlined Tags button;
- overflow menu button.

The message area includes:

- a centered conversation date;
- incoming messages aligned left in neutral gray bubbles;
- agent messages aligned right in pale-red bubbles;
- timestamps;
- customer avatars using the existing icon library;
- sent/read indicators where applicable.

The composer remains anchored at the bottom and includes attachment and emoji controls, a text input, and a red Send button.

### Details rail

Customer Details card:

- customer/dealer name;
- dealer code;
- location;
- phone;
- email;
- customer icon.

Ticket Details card:

- Ticket ID;
- Status;
- Chat Type;
- Priority;
- Created On;
- Channel;
- Assigned To.

Actions card:

- Mark as Pending;
- Close Chat.

Badges use both text and color so status is not communicated by color alone.

## Responsive Behavior

### Desktop

- Preserve the three-column workspace.
- Keep the filter fields in two horizontal rows.
- Maintain proportions and density close to the supplied reference.

### Tablet

- Allow filters to wrap into two or three columns.
- Show inbox and conversation side by side where space permits.
- Move the details rail below the conversation when the third column becomes too narrow.

### Mobile

- Stack filters vertically or in a compact two-column layout where comfortable.
- Present the inbox, conversation, and details as readable stacked sections.
- Keep all actions visible without horizontal scrolling.
- Make buttons and inputs touch-friendly.
- Allow long customer data, subjects, and messages to wrap safely.
- Keep the Logout control visible in the existing mobile application shell.

## Data and State

Extend the current ticket model with fields needed by the reference, including:

- `subject`;
- `dealerCode`;
- `chatType`;
- `region`;
- `zone`;
- `territory`;
- `status`;
- `priority`;
- `createdOn`;
- `channel`;
- `assignedTo`;
- customer contact information;
- dated messages.

State remains local to the page. Refreshing the browser may reset the demo data.

## Interactions

### Filters and search

- Filter inputs maintain draft values.
- Search applies all chosen filters to the inbox.
- Clear Filters resets all filter values and restores the applicable tab result set.
- Inbox search filters subjects, ticket IDs, dealer names, and message text.
- Empty results show a clear no-results state.

### Inbox tabs

- Chats shows all tickets.
- Pending shows pending tickets.
- Closed shows closed tickets.
- Counts remain visible in the tab labels.
- If the selected ticket is filtered out, select the first visible ticket or show an empty conversation state.

### Ticket selection

Selecting an inbox row updates the conversation and details rail.

### Messaging

- Send appends a right-aligned agent message to the active conversation.
- Whitespace-only messages are ignored.
- The input clears after a successful send.

### Ticket actions

- Mark as Pending changes the active ticket status to Pending.
- Close Chat changes the active ticket status to Closed.
- Status changes immediately update the inbox badge, tab membership, ticket details, and available actions.

### Tags and overflow

- Tags opens a compact local tag selector or menu for the active ticket.
- Chosen tags appear in the ticket context.
- The overflow control exposes relevant mock actions without navigating away.

### Export

- Export downloads the currently filtered ticket rows as a CSV file.
- The file includes ticket ID, subject, dealer, status, chat type, priority, created date, channel, and assignee.

## Component Structure

Refactor the current page into focused components, kept in the existing Customer Care feature area:

- `CustomerCare`
- `SupportFilters`
- `ChatInbox`
- `ChatTabs`
- `ChatListItem`
- `Conversation`
- `MessageBubble`
- `MessageComposer`
- `CustomerDetails`
- `TicketDetails`
- `TicketActions`

Small presentation components may remain in one file if splitting them would add complexity without improving maintainability.

## Accessibility

- Every input has a programmatic and visible label.
- Tabs use appropriate tab semantics and expose the active state.
- Icon-only controls have accessible names.
- Interactive rows are keyboard operable.
- All controls retain visible focus styles.
- Status and priority include readable text.
- Color contrast should meet WCAG AA where possible within the supplied design.
- Reduced-motion preferences are respected if transitions are used.

## Error and Empty States

- No filtered tickets: show `No chats found` and retain the filter controls.
- No active ticket: show a neutral prompt to select a chat.
- Empty message: do nothing and preserve page state.
- Export with no matches: download a header-only CSV or disable Export with a clear accessible state.
- Invalid or missing ticket fields: render a safe fallback such as `—`.

## Testing Strategy

Implement behavior test-first where practical.

Automated coverage will verify:

- page title, breadcrumb, and full filter panel;
- pending/closed/all tab filtering;
- ticket search and field filters;
- ticket selection updates the conversation and details;
- message sending;
- pending and close actions;
- CSV export behavior;
- mobile visibility of the primary workspace and controls.

Existing customer-care tests will be updated rather than duplicated.

## Visual QA

After implementation:

1. Open the local app in the user-selected in-app browser.
2. Capture the implemented page at the same desktop viewport and state as the reference.
3. Place the reference and implementation screenshots together for direct comparison.
4. Check layout dimensions, typography, spacing, borders, radii, colors, wrapping, and control visibility.
5. Fix visible mismatches and repeat the comparison.
6. Repeat core checks at a mobile viewport.
7. Record the findings in `/Users/zaid/Projects/ARC-project/design-qa.md`.
8. Finish only when `design-qa.md` reports `final result: passed`.

## Acceptance Criteria

- The desktop page is recognizably the same composition as the supplied screenshot.
- The filter panel and three-column workspace match the reference hierarchy and styling.
- Primary customer-care interactions work using local realistic data.
- The page remains usable and free of horizontal overflow on mobile.
- Shared ARC navigation, authentication, and unrelated routes remain intact.
- Relevant automated tests pass.
- Visual QA passes at desktop and mobile sizes.
- All files remain uncommitted on `customercare`; no remote or `main` changes occur.
