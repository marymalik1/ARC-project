import { expect, test } from './authenticated-test.js'

test('shows the Arc farm intelligence SVG in the shared sidebar', async ({ page }) => {
  await page.goto('/')

  const logo = page.getByRole('img', { name: 'Arc farm intelligence' })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('src', '/assets/arc-farm-intelligence.svg')
})

test('keeps the Logout action visible against the dark sidebar', async ({ page }) => {
  await page.goto('/')

  const logout = page.getByRole('button', { name: 'Logout' })
  await expect(logout).toBeVisible()
  await expect(logout).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(logout).toHaveCSS('color', 'rgb(243, 243, 244)')
})

test('renders and filters the ARC dealer table', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
  await expect(page.getByText('Ali Traders')).toBeVisible()

  await page.getByPlaceholder('Search by code or name...').fill('Khan')
  await page.getByRole('button', { name: 'Search', exact: true }).click()

  await expect(page.getByText('Khan Associates')).toBeVisible()
  await expect(page.getByText('Ali Traders')).toHaveCount(0)
})

test('serves dealer data, stats, and filter options through the App Router API', async ({ request }) => {
  const response = await request.get('/api/dealers')
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  expect(body.dealers[0].code).toBe('D00123')
  expect(body.total).toBe(body.stats.total)
  expect(body.stats.active + body.stats.inactive).toBe(body.stats.total)
  expect(body.facets.regions).toContain('Lahore')
  expect(body.syncedAt).toBeTruthy()
})

test('filters and paginates against the database', async ({ request }) => {
  const filtered = await request.get('/api/dealers?region=Lahore')
  const body = await filtered.json()

  expect(body.dealers.every((dealer) => dealer.region === 'Lahore')).toBe(true)
  expect(body.total).toBe(body.dealers.length)

  const firstPage = await request.get('/api/dealers?page=1&pageSize=2')
  const firstBody = await firstPage.json()

  expect(firstBody.dealers).toHaveLength(2)
  expect(firstBody.page).toBe(1)
  expect(firstBody.total).toBeGreaterThan(2)
})

test('reports live counts and real entry totals instead of fixed numbers', async ({ page }) => {
  await page.goto('/')

  const allAccounts = page.locator('.stat-card', { hasText: 'All Accounts' })
  const total = Number(await allAccounts.locator('strong').innerText())

  expect(total).toBeGreaterThan(0)
  await expect(page.getByText(`of ${total} entries`)).toBeVisible()
  await expect(page.getByText(/Live · synced/)).toBeVisible()
})

test('opens the create account dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
})
