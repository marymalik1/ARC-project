import { expect, test } from './authenticated-test.js'

test('opens the reference-aligned customer care workspace', async ({ page }) => {
  await page.goto('/customer-care')

  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
  await expect(page.getByLabel('Dealer Code')).toBeVisible()
  await expect(page.getByLabel('Dealer Name')).toBeVisible()
  await expect(page.getByLabel('Region')).toBeVisible()
  await expect(page.getByLabel('Zone')).toBeVisible()
  await expect(page.getByLabel('Territory')).toBeVisible()
  await expect(page.getByLabel('Chat Type')).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Pending \(\d+\)$/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()
  await expect(page.getByText('Customer Details')).toBeVisible()
})

test('applies and clears support filters and switches inbox tabs', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByLabel('Dealer Name').fill('Khan')
  await page.getByLabel('Chat Type').selectOption('Report Issue')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByText('Report not generating').first()).toBeVisible()
  await expect(page.getByText('Unable to login to the ARC portal')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear Filters' }).click()
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()

  await page.getByRole('tab', { name: /^Closed \(\d+\)$/ }).click()
  await expect(page.getByText('Export file is blank').first()).toBeVisible()
})

test('selects a chat, sends a reply, and closes the conversation', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByText('Report not generating').first().click()
  await expect(page.getByRole('heading', { name: 'Report not generating' })).toBeVisible()

  await page.getByLabel('Message').fill('The report service is available now.')
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText('The report service is available now.')).toBeVisible()
  await expect(page.getByLabel('Message')).toHaveValue('')

  await page.getByRole('button', { name: 'Close Chat' }).click()
  await page.getByRole('tab', { name: /^Closed \(\d+\)$/ }).click()
  await page.getByText('Report not generating').first().click()
  await expect(page.getByText('Closed', { exact: true }).last()).toBeVisible()
})

test('exports the visible support tickets as CSV', async ({ page }) => {
  await page.goto('/customer-care')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Export' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('customer-care-tickets.csv')
})

test('serves chats, tab counts, filter options, and tags from the database', async ({ request }) => {
  const response = await request.get('/api/tickets?tab=all')
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  expect(body.counts.pending + body.counts.closed).toBe(body.counts.all)
  expect(body.total).toBe(body.counts.all)
  expect(body.facets.chatTypes).toContain('Login Issue')
  expect(body.availableTags.length).toBeGreaterThan(0)
  // Not tickets[0]: chats are newest-first, and a chat opened with the New Chat
  // button starts with no messages at all. Threads still have to be served, so
  // assert that against a chat that has one rather than whichever is newest.
  expect(body.tickets.some((ticket) => ticket.messages.length > 0)).toBe(true)
  expect(body.syncedAt).toBeTruthy()
})

test('keeps a reply after a reload instead of losing it with page state', async ({ page }) => {
  await page.goto('/customer-care')
  await page.getByText('Product expired on dashboard').first().click()

  const reply = `Stock record refreshed ${Date.now()}.`
  await page.getByLabel('Message').fill(reply)
  await page.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText(reply)).toBeVisible()

  await page.reload()
  await page.getByText('Product expired on dashboard').first().click()
  await expect(page.getByText(reply)).toBeVisible()
})

test('reports live chat counts rather than fixed totals', async ({ page }) => {
  await page.goto('/customer-care')

  const pendingTab = page.getByRole('tab', { name: /^Pending \(\d+\)$/ })
  const pending = Number((await pendingTab.innerText()).match(/\d+/)[0])

  await expect(page.getByText(`of ${pending} chats`)).toBeVisible()
  await expect(page.getByText(/Live · synced/)).toBeVisible()
})

test('keeps customer care and logout controls usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/customer-care')

  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible()
  await expect(page.getByText('Unable to login to the ARC portal').first()).toBeVisible()

  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
})
