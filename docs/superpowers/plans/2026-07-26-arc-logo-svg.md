# ARC Farm Intelligence SVG Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-drawn ARC sidebar brand with an accessible, responsive SVG recreation of the supplied “Arc) farm intelligence” logo.

**Architecture:** Keep `ArcLogo` as the single shared React component used by `Sidebar`, but make it render a public SVG asset through a normal image element. The SVG owns the vector artwork and transparent view box; the global stylesheet owns only responsive placement inside the two existing sidebar layouts.

**Tech Stack:** Next.js 16 App Router, React 19, SVG, CSS, Playwright

## Global Constraints

- Use the supplied JPEG only as the visual source.
- The SVG must contain vector artwork and must not embed the JPEG.
- The SVG background must be transparent with a tight view box.
- Preserve the wording, capitalization, trademark mark, white/red colors, proportions, and relative placement of the supplied artwork.
- Keep `ArcLogo` as the shared branding component on User Management and Customer Care.
- The image text alternative must be exactly `Arc farm intelligence`.
- Do not change page titles, metadata, navigation, or favicon behavior.
- Preserve all unrelated working-tree changes.

---

### Task 1: Replace the shared sidebar brand with the SVG asset

**Files:**
- Create: `public/assets/arc-farm-intelligence.svg`
- Modify: `src/components/ArcLogo.jsx:1-27`
- Modify: `src/app/globals.css:83-103`
- Modify: `src/app/globals.css:1022-1035`
- Modify: `src/app/globals.css:1821-1834`
- Test: `tests/e2e/user-management.spec.js`

**Interfaces:**
- Consumes: `Sidebar` imports the default `ArcLogo` component without props.
- Produces: `ArcLogo(): JSX.Element`, containing an image whose `src` is `/assets/arc-farm-intelligence.svg` and whose `alt` is `Arc farm intelligence`.

- [x] **Step 1: Add the failing shared-logo browser assertion**

Add this test to `tests/e2e/user-management.spec.js`:

```js
test('shows the Arc farm intelligence SVG in the shared sidebar', async ({ page }) => {
  await page.goto('/')

  const logo = page.getByRole('img', { name: 'Arc farm intelligence' })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('src', '/assets/arc-farm-intelligence.svg')
})
```

- [x] **Step 2: Run the focused test and verify the red state**

Run:

```bash
npx playwright test tests/e2e/user-management.spec.js --grep "shows the Arc farm intelligence SVG"
```

Expected: FAIL because the current component has no image with the accessible name `Arc farm intelligence`.

- [x] **Step 3: Create the true-vector SVG asset**

Create `public/assets/arc-farm-intelligence.svg` with a transparent background, a tight landscape view box, white vector text, and the red parenthesis path. Use SVG text and path elements only; do not add an `<image>` element or encoded raster data.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 590 205">
  <g fill="#fff" font-family="Arial, Helvetica, sans-serif">
    <text x="0" y="151" font-size="132" font-weight="700">Arc</text>
    <text x="229" y="79" font-size="27">TM</text>
    <text x="338" y="105" font-size="49">farm</text>
    <text x="338" y="158" font-size="49">intelligence</text>
  </g>
  <path
    d="M278 3C307 68 307 137 278 202"
    fill="none"
    stroke="#ff2d30"
    stroke-linecap="round"
    stroke-width="13"
  />
</svg>
```

Compare the rendered SVG with the supplied JPEG before continuing. Adjust only the numeric SVG geometry if needed to preserve the source artwork's relative placement and prevent clipping.

- [x] **Step 4: Replace the component implementation**

Replace `src/components/ArcLogo.jsx` with:

```jsx
export default function ArcLogo() {
  return (
    <div className="arc-logo">
      <img
        className="arc-logo-image"
        src="/assets/arc-farm-intelligence.svg"
        alt="Arc farm intelligence"
      />
    </div>
  )
}
```

- [x] **Step 5: Replace the obsolete mark-and-text sizing rules**

In `src/app/globals.css`, keep the existing `.arc-logo` height and alignment but remove its `gap` and text color. Remove `.arc-mark` and `.arc-logo span`, then add:

```css
.arc-logo-image {
  display: block;
  width: 100%;
  max-width: 280px;
  height: auto;
}
```

For the large Customer Care sidebar, replace the obsolete `.arc-mark` and `.arc-logo span` overrides with:

```css
.customer-care-shell .arc-logo-image {
  max-width: 360px;
}
```

Inside `@media (max-width: 2200px)`, replace those obsolete overrides with:

```css
.customer-care-shell .arc-logo-image {
  max-width: 256px;
}
```

- [x] **Step 6: Run the focused test and verify the green state**

Run:

```bash
npx playwright test tests/e2e/user-management.spec.js --grep "shows the Arc farm intelligence SVG"
```

Expected: PASS with one passing test.

- [x] **Step 7: Run the full automated verification suite**

Run:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Expected: every command exits with status 0 and reports no failed tests or lint errors.

- [x] **Step 8: Inspect the logo at desktop and mobile sizes**

Open `/` and `/customer-care` at the existing desktop viewport, then inspect `/` at a mobile viewport. Confirm the full wordmark is visible, the SVG background is transparent, the white/red artwork is legible against the dark sidebar, and the image is not stretched or clipped.

- [x] **Step 9: Commit the implementation**

Stage only the logo asset, component, focused stylesheet hunks, and focused test:

```bash
git add public/assets/arc-farm-intelligence.svg src/components/ArcLogo.jsx tests/e2e/user-management.spec.js
git add -p src/app/globals.css
git commit -m "feat: use Arc farm intelligence SVG logo"
```
