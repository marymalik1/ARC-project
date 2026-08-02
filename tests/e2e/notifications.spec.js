import { expect, test } from './authenticated-test.js'

const bell = (page) => page.getByRole('button', { name: /notification/i })

// The bell reads its feed as soon as it mounts, so waiting for that response is
// also how we know the button is wired up and a click will not be swallowed.
async function open(page, path = '/') {
  const feed = page.waitForResponse((response) => response.url().includes('/api/notifications'))
  await page.goto(path)
  await feed
  await bell(page).click()

  return page.locator('#notification-panel')
}

test('the header bell opens a dropdown of real pending work', async ({ page }) => {
  const feed = page.waitForResponse((response) => response.url().includes('/api/notifications'))
  await page.goto('/')
  await feed

  await expect(page.locator('#notification-panel')).toBeHidden()

  await bell(page).click()
  const panel = page.locator('#notification-panel')
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Notifications' })).toBeVisible()

  // Every row is live work from the modules, not a placeholder.
  const first = page.locator('.notification-item').first()
  await expect(first).toBeVisible()
  await expect(first).toContainText(/New support chat from|Dealer awaiting verification/)
})

test('the dropdown closes on Escape and on a click outside it', async ({ page }) => {
  const panel = await open(page)
  await expect(panel).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()

  await bell(page).click()
  await expect(panel).toBeVisible()
  // Somewhere the panel does not cover, and inert enough not to navigate away.
  await page.getByText('Home', { exact: true }).click()
  await expect(panel).toBeHidden()
})

test('marking all as read clears the badge, and it stays cleared', async ({ page }) => {
  const panel = await open(page)
  await expect(panel).toBeVisible()

  // Reading the list is not enough on its own — the badge waits to be cleared.
  await expect(bell(page)).not.toHaveAttribute('aria-label', '0 new notifications')
  await expect(page.locator('.notification-item--unread').first()).toBeVisible()

  await page.getByRole('button', { name: 'Mark all read' }).click()

  await expect(bell(page)).toHaveAttribute('aria-label', '0 new notifications')
  await expect(page.locator('.notification-item--unread')).toHaveCount(0)
  // The rows stay listed, so the control that cleared them goes quiet instead.
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeDisabled()
  await expect(panel.locator('.notification-item').first()).toBeVisible()

  await page.keyboard.press('Escape')

  const feed = page.waitForResponse((response) => response.url().includes('/api/notifications'))
  await page.reload()
  await feed
  await expect(bell(page)).toHaveAttribute('aria-label', '0 new notifications')
})

test('clearing empties the bell without touching the work behind it', async ({ page }) => {
  const panel = await open(page)
  await expect(page.locator('.notification-item').first()).toBeVisible()

  await page.getByRole('button', { name: 'Clear all' }).click()

  await expect(page.locator('.notification-item')).toHaveCount(0)
  await expect(panel.getByText('Cleared. New activity will show up here.')).toBeVisible()
  await expect(bell(page)).toHaveAttribute('aria-label', '0 new notifications')

  // Cleared in this browser only: the chats themselves are still pending.
  const feed = await page.request.get('/api/notifications')
  expect((await feed.json()).notifications.length).toBeGreaterThan(0)

  const reloaded = page.waitForResponse((response) => response.url().includes('/api/notifications'))
  await page.reload()
  await reloaded
  await bell(page).click()
  await expect(page.locator('.notification-item')).toHaveCount(0)
})

test('following a notification marks that one read and leaves the rest', async ({ page }) => {
  await open(page)

  const before = await page.locator('.notification-item--unread').count()

  // Registered before the click: the next page's bell reads on mount, and the
  // response can land before a waiter set up afterwards would be listening.
  const feed = page.waitForResponse((response) => response.url().includes('/api/notifications'))
  await page.locator('.notification-item', { hasText: 'New support chat' }).first().click()
  await expect(page).toHaveURL(/\/customer-care$/)
  await feed
  await bell(page).click()
  await expect(page.locator('.notification-item--unread')).toHaveCount(before - 1)
})

test('a support notification opens the chat it came from', async ({ page }) => {
  await open(page)

  await page.locator('.notification-item', { hasText: 'New support chat' }).first().click()

  await expect(page).toHaveURL(/\/customer-care$/)
  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
})

test('the feed is refused to callers without a session', async ({ browser }) => {
  const anonymous = await browser.newContext()
  const response = await anonymous.request.get('/api/notifications')

  expect(response.status()).toBe(401)
  await anonymous.close()
})
