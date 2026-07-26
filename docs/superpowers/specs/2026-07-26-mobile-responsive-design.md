# ARC Dashboard Mobile Responsive Design

## Goal

Make User Management and Customer Care fully usable on a 390-pixel-wide
mobile viewport without creating separate mobile-only pages.

## Responsive Architecture

- Keep the existing desktop layouts unchanged above their current breakpoints.
- Continue using the shared off-canvas sidebar below 900 pixels.
- Apply focused mobile reflow rules at 650 pixels for User Management and
  760 pixels for Customer Care.
- Preserve the existing React components and use semantic markup plus CSS
  rather than duplicate mobile components.
- Prevent document-level horizontal overflow at mobile widths.

## Shared Navigation

- Keep the sidebar hidden off canvas until the menu button is activated.
- Keep the scrim and close button behavior.
- Scale the Arc farm intelligence SVG within the drawer without clipping or
  distortion.
- Keep navigation labels, logout, and footer readable within the viewport.

## User Management

- Render statistics and filter fields in a single column.
- Keep filter actions in a two-column grid, falling back to one column when
  needed for long labels.
- Convert the wide dealer table into stacked dealer cards on mobile.
- Add visible field labels to each card value while preserving the semantic
  table structure for larger viewports.
- Keep edit and delete actions accessible on every dealer card.
- Allow pagination to scroll within its own container without widening the
  page.
- Keep the create/edit account dialog within the viewport with a single-column
  form and vertical scrolling when required.

## Customer Care

- Stack the ticket list, conversation, and details rail vertically.
- Remove desktop minimum widths that cause horizontal overflow.
- Let conversation header actions wrap beneath the ticket identity when space
  is limited.
- Keep message bubbles within the viewport and allow long text to wrap.
- Reflow the message composer so attachment controls, input, and send action
  remain usable at 390 pixels.
- Stack detail cards and keep their labels and values readable without
  truncating essential information.

## Accessibility and Interaction

- Preserve existing accessible names and semantic controls.
- Maintain touch targets of at least 40 pixels for primary mobile controls.
- Keep keyboard focus behavior unchanged.
- Respect the existing reduced-motion media query.

## Verification

- Add Playwright coverage at a 390-by-844 viewport.
- Verify the mobile menu opens and exposes the SVG logo.
- Verify the document does not overflow horizontally on User Management and
  Customer Care.
- Verify a dealer is presented as a labeled card and its edit action works.
- Verify the Customer Care ticket list, conversation, composer, and details
  appear in vertical order.
- Run the complete unit test suite, browser suite, linter, and production
  build.
- Inspect screenshots of both pages at desktop and mobile widths to ensure
  desktop behavior is preserved.
