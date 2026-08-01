import { expect, test } from './authenticated-test.js'

test.use({ viewport: { width: 390, height: 844 } })

test('reflows User Management into labeled dealer cards', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('img', { name: 'Arc farm intelligence' })).toBeVisible()

  const sidebar = page.getByRole('complementary')
  await expect(sidebar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')

  const logout = page.getByRole('button', { name: 'Logout' })
  await expect(logout).toBeVisible()
  await expect(logout).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const logoutBox = await logout.boundingBox()
  expect(logoutBox.x).toBeGreaterThanOrEqual(0)
  expect(logoutBox.y + logoutBox.height).toBeLessThanOrEqual(844)

  await sidebar.getByRole('button', { name: 'Close menu' }).click()

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

  const editButton = page.getByRole('button', { name: 'Edit Ali Traders' })
  const editButtonBox = await editButton.boundingBox()
  expect(editButtonBox.height).toBeGreaterThanOrEqual(40)

  await editButton.click()
  await expect(page.getByRole('heading', { name: 'Edit Account' })).toBeVisible()
})

test('stacks Customer Care panels and header actions on mobile', async ({ page }) => {
  await page.goto('/customer-care')

  const layout = await page.evaluate(() => {
    const panelTops = [
      '.chat-inbox',
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
  const conversation = page.locator('.conversation-panel')
  const send = page.getByRole('button', { name: 'Send' })
  const [composerBox, conversationBox, sendBox] = await Promise.all([
    composer.boundingBox(),
    conversation.boundingBox(),
    send.boundingBox(),
  ])

  expect(sendBox.width).toBeGreaterThanOrEqual(composerBox.width - 32)
  expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(conversationBox.y + conversationBox.height)
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible()
  await expect(page.getByText('Customer Details')).toBeVisible()
})
