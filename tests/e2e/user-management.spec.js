import { expect, test } from '@playwright/test'

test('shows the Arc farm intelligence SVG in the shared sidebar', async ({ page }) => {
  await page.goto('/')

  const logo = page.getByRole('img', { name: 'Arc farm intelligence' })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAttribute('src', '/assets/arc-farm-intelligence.svg')
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

test('serves dealer data through the App Router API', async ({ request }) => {
  const response = await request.get('/api/dealers')
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  expect(body.dealers).toHaveLength(5)
  expect(body.dealers[0].code).toBe('D00123')
})

test('opens the create account dialog', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
})
