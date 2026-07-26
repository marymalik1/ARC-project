# ARC Dashboard Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflow User Management and Customer Care into fully usable layouts at a 390-by-844 mobile viewport while preserving the existing desktop presentation.

**Architecture:** Add a focused global `mobile.css` stylesheet after the existing design system so mobile overrides remain isolated from the user's in-progress Customer Care CSS. Add only the semantic table labels needed by the mobile dealer-card presentation; retain the existing React component tree and off-canvas sidebar.

**Tech Stack:** Next.js 16 App Router, React 19, CSS media queries, Playwright

## Global Constraints

- Preserve the existing desktop layouts above their current breakpoints.
- Use the shared off-canvas sidebar below 900 pixels.
- Use focused mobile reflow rules at 650 pixels for User Management and 760 pixels for Customer Care.
- Do not create duplicate mobile-only React components.
- The document must not overflow horizontally at a 390-pixel viewport.
- Preserve existing accessible names, keyboard behavior, and reduced-motion behavior.
- Keep primary mobile touch targets at least 40 pixels high.
- Preserve all unrelated working-tree changes.

---

### Task 1: Reflow User Management into mobile dealer cards

**Files:**
- Create: `src/app/mobile.css`
- Modify: `src/app/layout.jsx:1`
- Modify: `src/components/DealersTable.jsx:21-44`
- Create: `tests/e2e/mobile-responsive.spec.js`

**Interfaces:**
- Consumes: each dealer row already contains the eight desktop table fields and existing edit/delete buttons.
- Produces: each data cell exposes a `data-label` matching its desktop column name; `mobile.css` presents those cells as a labeled card only at `max-width: 650px`.

- [x] **Step 1: Add the failing User Management mobile test**

Create `tests/e2e/mobile-responsive.spec.js`:

```js
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('reflows User Management into labeled dealer cards', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('img', { name: 'Arc farm intelligence' })).toBeVisible()
  await page.getByRole('button', { name: 'Close menu' }).click()

  const firstDealer = page.locator('tbody tr', { hasText: 'Ali Traders' })
  await expect(firstDealer.locator('td[data-label="Dealer Code"]')).toBeVisible()
  await expect(firstDealer.locator('td[data-label="Actions"]')).toBeVisible()

  const metrics = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    rowWidth: Math.round(document.querySelector('tbody tr').getBoundingClientRect().width),
  }))

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.rowWidth).toBeLessThanOrEqual(metrics.viewportWidth - 32)

  await page.getByRole('button', { name: 'Edit Ali Traders' }).click()
  await expect(page.getByRole('heading', { name: 'Edit Account' })).toBeVisible()
})
```

- [x] **Step 2: Run the focused test and verify the red state**

Run:

```bash
npx playwright test tests/e2e/mobile-responsive.spec.js --grep "reflows User Management"
```

Expected: FAIL because the dealer cells do not yet expose mobile labels and the row still renders as a 1,100-pixel table row.

- [x] **Step 3: Add semantic mobile labels to dealer cells**

Update the populated row in `src/components/DealersTable.jsx`:

```jsx
<tr key={dealer.code}>
  <td data-label="Dealer Code">{dealer.code}</td>
  <td data-label="Dealer Name">{dealer.name}</td>
  <td data-label="Region">{dealer.region}</td>
  <td data-label="Zone">{dealer.zone}</td>
  <td data-label="Territory">{dealer.territory}</td>
  <td data-label="Status">
    <span className={`status status--${dealer.status.toLowerCase()}`}>
      <span />
      {dealer.status}
    </span>
  </td>
  <td data-label="Created On">{dealer.createdOn}</td>
  <td data-label="Actions">
    <div className="row-actions">
      <button type="button" onClick={() => onEdit(dealer)} aria-label={`Edit ${dealer.name}`}>
        <Pencil />
      </button>
      <button className="delete-action" type="button" onClick={() => onDelete(dealer.code)} aria-label={`Delete ${dealer.name}`}>
        <Trash2 />
      </button>
    </div>
  </td>
</tr>
```

- [x] **Step 4: Load the focused mobile stylesheet**

Add this import immediately after the existing global stylesheet import in `src/app/layout.jsx`:

```jsx
import './globals.css'
import './mobile.css'
```

- [x] **Step 5: Add the User Management mobile reflow**

Create `src/app/mobile.css` with:

```css
@media (max-width: 650px) {
  .content {
    padding: 24px 16px 36px;
  }

  .page-heading {
    padding-left: 0;
  }

  .stats-grid,
  .filter-panel {
    gap: 16px;
    margin-top: 22px;
  }

  .stat-card {
    height: auto;
    min-height: 132px;
    gap: 18px;
    padding: 18px;
  }

  .filter-panel {
    padding: 20px 16px;
  }

  .filter-actions {
    gap: 12px;
  }

  .button {
    min-height: 48px;
    height: auto;
    padding-block: 12px;
  }

  .table-card {
    overflow: visible;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .table-scroll {
    overflow: visible;
  }

  .table-scroll table,
  .table-scroll tbody,
  .table-scroll tr,
  .table-scroll td {
    display: block;
  }

  .table-scroll table {
    min-width: 0;
  }

  .table-scroll thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  .table-scroll tbody {
    display: grid;
    gap: 14px;
  }

  .table-scroll tbody tr {
    display: grid;
    width: 100%;
    padding: 8px 16px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 2px 5px rgba(20, 20, 20, 0.035);
  }

  .table-scroll tbody td {
    display: grid;
    width: 100%;
    min-height: 48px;
    height: auto;
    grid-template-columns: minmax(96px, 0.8fr) minmax(0, 1.2fr);
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    text-align: left;
    white-space: normal;
  }

  .table-scroll tbody td::before {
    content: attr(data-label);
    color: #66676b;
    font-size: 13px;
    font-weight: 700;
  }

  .table-scroll .row-actions {
    justify-content: flex-start;
  }

  .table-scroll .empty-row {
    display: block;
    padding: 22px 0;
    text-align: center;
  }

  .table-scroll .empty-row::before {
    content: none;
  }

  .table-footer {
    margin-top: 14px;
    padding: 16px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
}
```

- [x] **Step 6: Run the focused test and verify the green state**

Run:

```bash
npx playwright test tests/e2e/mobile-responsive.spec.js --grep "reflows User Management"
```

Expected: PASS with one passing test.

- [x] **Step 7: Commit Task 1**

Stage the focused files and only the new import hunk from `layout.jsx`:

```bash
git add src/app/mobile.css src/components/DealersTable.jsx tests/e2e/mobile-responsive.spec.js
git add -p src/app/layout.jsx
git commit -m "feat: reflow dealer management on mobile"
```

### Task 2: Reflow Customer Care mobile actions and composer

**Files:**
- Modify: `src/app/mobile.css`
- Modify: `tests/e2e/mobile-responsive.spec.js`

**Interfaces:**
- Consumes: the existing `.support-workspace`, `.conversation-header`, `.conversation-header-actions`, `.message-composer`, and `.send-button` elements.
- Produces: a vertical support workspace with header actions below the ticket identity and a full-width send action at `max-width: 480px`.

- [x] **Step 1: Add failing Customer Care mobile tests**

Append to `tests/e2e/mobile-responsive.spec.js`:

```js
test('stacks Customer Care panels and header actions on mobile', async ({ page }) => {
  await page.goto('/customer-care')

  const layout = await page.evaluate(() => {
    const panelTops = [
      '.ticket-list-panel',
      '.conversation-panel',
      '.ticket-details-rail',
    ].map((selector) => Math.round(document.querySelector(selector).getBoundingClientRect().top))
    const identity = document.querySelector('.conversation-header > div').getBoundingClientRect()
    const actions = document.querySelector('.conversation-header-actions').getBoundingClientRect()

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      panelTops,
      actionsBelowIdentity: actions.top >= identity.bottom,
    }
  })

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
  expect(layout.panelTops[0]).toBeLessThan(layout.panelTops[1])
  expect(layout.panelTops[1]).toBeLessThan(layout.panelTops[2])
  expect(layout.actionsBelowIdentity).toBeTruthy()
})

test('gives the Customer Care send action a full-width mobile row', async ({ page }) => {
  await page.goto('/customer-care')

  const composer = page.locator('.message-composer')
  const send = page.getByRole('button', { name: 'Send' })
  const [composerBox, sendBox] = await Promise.all([
    composer.boundingBox(),
    send.boundingBox(),
  ])

  expect(sendBox.width).toBeGreaterThanOrEqual(composerBox.width - 32)
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible()
  await expect(page.getByText('Customer Details')).toBeVisible()
})
```

- [x] **Step 2: Run the Customer Care tests and verify the red state**

Run:

```bash
npx playwright test tests/e2e/mobile-responsive.spec.js --grep "Customer Care"
```

Expected: both tests FAIL because the header actions remain beside the ticket identity and the send button remains a narrow final grid column.

- [x] **Step 3: Add the Customer Care mobile reflow**

Append to `src/app/mobile.css`:

```css
@media (max-width: 760px) {
  .customer-care-heading h1 {
    font-size: 32px;
  }

  .support-workspace {
    gap: 16px;
  }

  .conversation-header {
    align-items: stretch;
    flex-direction: column;
    gap: 18px;
  }

  .conversation-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .message-bubble {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .ticket-detail-list > div {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  }

  .ticket-detail-list dd {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 480px) {
  .message-composer {
    height: auto;
    min-height: 118px;
    grid-template-columns: 40px 40px minmax(0, 1fr);
    grid-template-rows: 48px 48px;
    gap: 8px;
    padding: 8px;
  }

  .message-composer > button:not(.send-button) {
    width: 40px;
    height: 40px;
  }

  .message-composer input {
    min-width: 0;
    padding-inline: 8px;
  }

  .send-button {
    width: 100%;
    height: 48px;
    grid-column: 1 / -1;
  }
}
```

- [x] **Step 4: Run the Customer Care tests and verify the green state**

Run:

```bash
npx playwright test tests/e2e/mobile-responsive.spec.js --grep "Customer Care"
```

Expected: PASS with two passing tests.

- [x] **Step 5: Run the full automated verification suite**

Run:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Expected: every command exits with status 0 and reports no failed tests or lint errors.

- [x] **Step 6: Inspect desktop and mobile screenshots**

Inspect `/` and `/customer-care` at 1440 by 1000 and 390 by 844. Confirm:

- the desktop layouts remain unchanged;
- the mobile page has no document-level horizontal scroll;
- dealer rows appear as labeled cards with accessible actions;
- Customer Care panels appear in vertical order;
- the conversation header and composer do not clip or overlap;
- the mobile drawer shows the full SVG logo.

- [x] **Step 7: Commit Task 2**

```bash
git add src/app/mobile.css tests/e2e/mobile-responsive.spec.js
git commit -m "feat: reflow customer care on mobile"
```
