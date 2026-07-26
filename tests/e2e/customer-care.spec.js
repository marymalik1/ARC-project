import { expect, test } from '@playwright/test'

test('opens customer care from the ARC navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Customer Care' }).click()

  await expect(page).toHaveURL(/\/customer-care$/)
  await expect(page.getByRole('heading', { name: 'Customer Care' })).toBeVisible()
  await expect(page.getByText('TKT-000321').first()).toBeVisible()
  await expect(page.getByText('Customer Details')).toBeVisible()
})

test('filters tickets and sends a support reply', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByPlaceholder('Search tickets...').fill('Khan')
  await expect(page.getByRole('button', { name: /TKT-000320/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /TKT-000321/ })).toHaveCount(0)

  await page.getByPlaceholder('Search tickets...').fill('')
  await page.getByPlaceholder('Type your message...').fill('Your password is now reset.')
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText('Your password is now reset.')).toBeVisible()
  await expect(page.getByPlaceholder('Type your message...')).toHaveValue('')
})

test('updates ticket status from the actions panel', async ({ page }) => {
  await page.goto('/customer-care')

  await page.getByRole('button', { name: 'Resolve Ticket' }).click()

  await expect(page.getByText('Resolved', { exact: true }).last()).toBeVisible()
})
