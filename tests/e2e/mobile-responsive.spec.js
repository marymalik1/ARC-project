import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('reflows User Management into labeled dealer cards', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('img', { name: 'Arc farm intelligence' })).toBeVisible()
  await page.getByRole('complementary').getByRole('button', { name: 'Close menu' }).click()

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
