# Customer Care Design QA

## Comparison target

- Source visual truth: `/var/folders/0b/0jn3zdq93k51zwzdmrl6sqsw0000gn/T/codex-clipboard-856c0d0d-34be-4deb-b686-5d43773ed0d9.png`
- Browser-rendered implementation: `/tmp/customer-care-desktop-final.png`
- Mobile implementation: `/tmp/customer-care-mobile-final.png`
- Full-view comparison: `/tmp/customer-care-comparison-final.png`
- Focused comparison: `/tmp/customer-care-comparison-focus-final.png`
- Route: `http://localhost:3000/customer-care`
- State: authenticated demo account, Pending tab active, first ticket selected

## Viewport and normalization

- Source pixels: `2384 × 1722`
- Desktop implementation pixels: `1871 × 1468`
- Desktop CSS viewport: `1871 × 1468`
- Mobile CSS viewport: `390 × 844`
- Mobile implementation pixels: `390 × 3443` full-page capture
- Density normalization: the source was resized with `fit: contain` to `1871 × 1468`; the implementation capture remained `1871 × 1468`. Both normalized images were placed in the same side-by-side comparison canvas.
- The source omits the ARC application shell. The implementation retains the existing sidebar and header by approved product constraint, so the comparison treats the support workspace inside the shell as the matching content region.

## Full-view comparison evidence

- Information hierarchy matches the source: title and breadcrumb, two-row filter card, inbox, conversation, details rail, and action cards.
- Desktop DOM measurements confirm a three-column workspace with no page overflow:
  - inbox: `399 × 768`
  - conversation: `729 × 768`
  - details rail: `373 × 768`
  - complete workspace: `1529 × 768`
- The filter panel contains all eight labeled controls and the Clear Filters, Search, and Export actions.
- Pending is the initial active tab, the selected row uses a pale-red surface with a red leading rule, and conversation bubbles follow the reference's gray-left/red-right pattern.
- The details rail contains Customer Details, Ticket Details, and Actions in the same order as the source.

## Focused region comparison evidence

- `/tmp/customer-care-comparison-focus-final.png` compares the filter, chat inbox, conversation header, selected row, and initial message state at readable scale.
- Field labels, white inputs, light-gray borders, restrained radii, red tab underline, selected ticket styling, heading hierarchy, and message colors follow the source.
- The focused comparison exposed locale-generated date copy during the first pass. The controls were replaced with reference-aligned `Select from date` and `Select to date` copy plus Lucide calendar icons.

## Required fidelity surfaces

### Fonts and typography

- Uses the application's existing sans-serif stack and matches the source's bold page title, medium control labels, compact inbox metadata, and readable message hierarchy.
- Subjects truncate in the inbox and wrap safely in the conversation header and mobile layout.

### Spacing and layout rhythm

- Desktop uses the approved three-column proportions and consistent 14px workspace gaps.
- Cards use subtle borders, low elevation, and compact radii matching the source.
- Mobile stacks filters, inbox, conversation, and details without page-level horizontal overflow.

### Colors and visual tokens

- White and near-white surfaces, neutral gray borders, ARC red primary actions, pale-red selection, gray incoming bubbles, and pale-red agent bubbles match the source.
- Pending, Closed, priority, and chat-type states remain readable as text in addition to color.

### Image quality and asset fidelity

- The source workspace contains interface icons rather than raster imagery.
- All visible workspace icons use the existing Lucide icon library with consistent stroke weight.
- The retained ARC shell uses the project's approved ARC logo asset; no CSS art, emoji, handcrafted SVG, or fake imagery was introduced.

### Copy and content

- Ticket subjects, IDs, dealer names, customer details, messages, ticket metadata, filters, tabs, pagination, and action labels match the supplied reference.
- The functional Pending tab correctly contains Pending records only; the source's visually listed Closed record is available under Closed.

## Responsive and accessibility verification

- Mobile viewport: `390 × 844`
- Document client width: `390`
- Document scroll width: `390`
- Search, message composer, Mark as Pending, and Close Chat remain visible.
- Opening the mobile navigation exposes Logout.
- Labeled inputs, semantic tabs, text status badges, accessible icon controls, visible focus rings, and reduced-motion safeguards are present.
- No browser console warnings or errors were recorded at desktop or mobile sizes.

## Interaction verification

- Dealer Name plus Chat Type filters narrowed the inbox to `Report not generating`.
- Clear Filters restored four Pending demo records.
- Closed displayed the Closed records.
- Selecting a ticket updated the conversation and detail rail.
- Sending a reply appended it and cleared the composer.
- Tags selected and displayed `Follow Up`.
- Close Chat moved the selected record from Pending to Closed.
- Export exposes `customer-care-tickets.csv` through a generated CSV data link; CSV content and escaping are covered by unit tests.

## Automated checks

- `npm test`: passed, 15 tests
- `npm run lint`: passed
- `npm run build`: passed
- `git diff --check`: passed
- Saved Playwright scenarios were updated but not executed because the selected Browser constraint prohibits direct Playwright CLI use without separate approval.

## Findings

No actionable P0, P1, or P2 visual findings remain.

The retained ARC sidebar/header and the functional Pending-tab membership are intentional, approved product differences from the isolated source screenshot.

## Comparison history

- First pass: native date inputs displayed locale copy rather than the reference's descriptive date prompts.
- Fix: added reference-aligned date controls with `Select from date` and `Select to date` copy and matching calendar icons.
- Post-fix evidence: both date controls render the approved copy in `/tmp/customer-care-desktop-final.png`; desktop and mobile console checks remain clean.
- No P0, P1, or P2 findings were introduced or left unresolved.

## Follow-up polish

- P3: the exact system font rasterization can vary by operating system, but hierarchy, weight, scale, and wrapping remain aligned with the source.

final result: passed
