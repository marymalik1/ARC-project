import { expect, test } from '@playwright/test'

test('redirects unauthenticated dashboard requests to login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
})

test('allows a valid demo session to open the dashboard', async ({ context, page }) => {
  await context.addCookies([{
    name: 'arc_demo_session',
    value: 'authenticated',
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
})

test('rejects invalid demo credentials without creating a session', async ({ request }) => {
  const response = await request.post('/api/demo-auth/login', {
    form: {
      email: 'admin@arcfarm.com',
      password: 'wrong-password',
    },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(303)
  const location = new URL(response.headers().location)
  expect(`${location.pathname}${location.search}`).toBe('/login?error=invalid')
  expect(response.headers()['set-cookie']).toBeUndefined()
})

test('creates the constrained demo session for valid credentials', async ({ request }) => {
  const response = await request.post('/api/demo-auth/login', {
    form: {
      email: 'admin@arcfarm.com',
      password: 'Arc@123',
    },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(303)
  expect(new URL(response.headers().location).pathname).toBe('/')
  expect(response.headers()['set-cookie']).toContain('arc_demo_session=authenticated')
  expect(response.headers()['set-cookie']).toContain('HttpOnly')
  expect(response.headers()['set-cookie']).toContain('SameSite=lax')
})

test('clears the demo session on logout', async ({ request }) => {
  const response = await request.post('/api/demo-auth/logout', {
    headers: {
      Cookie: 'arc_demo_session=authenticated',
    },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(303)
  expect(new URL(response.headers().location).pathname).toBe('/login')
  expect(response.headers()['set-cookie']).toContain('arc_demo_session=')
  expect(response.headers()['set-cookie']).toContain('Max-Age=0')
})

test('signs in with the sample credentials', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('img', { name: 'Arc farm intelligence' })).toBeVisible()
  await expect(page.getByText('admin@arcfarm.com')).toBeVisible()
  await expect(page.getByText('Arc@123')).toBeVisible()

  await page.getByLabel('Email address').fill('admin@arcfarm.com')
  await page.getByLabel('Password', { exact: true }).fill('Arc@123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL('http://127.0.0.1:3000/')
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
})

test('shows a generic error for invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@arcfarm.com')
  await page.getByLabel('Password', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.locator('.login-error[role="alert"]')).toHaveText('Invalid email or password.')
  await expect(page).toHaveURL(/\/login\?error=invalid$/)
})

test('shows a safe fallback for an unavailable login submission', async ({ page }) => {
  await page.goto('/login?error=unavailable')

  await expect(page.locator('.login-error[role="alert"]')).toHaveText('Unable to sign in right now.')
})

test('toggles password visibility', async ({ page }) => {
  await page.goto('/login')
  const password = page.getByLabel('Password', { exact: true })

  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('logs out and clears access to the dashboard', async ({ context, page }) => {
  await context.addCookies([{
    name: 'arc_demo_session',
    value: 'authenticated',
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])
  await page.goto('/')
  await page.getByRole('button', { name: 'Logout' }).click()

  await expect(page).toHaveURL('http://127.0.0.1:3000/login')
  await page.goto('/customer-care')
  await expect(page).toHaveURL(/\/login$/)
})

test.describe('mobile login', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fits the login form within the mobile viewport', async ({ page }) => {
    await page.goto('/login')

    const metrics = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      emailHeight: Math.round(document.querySelector('#login-email').getBoundingClientRect().height),
      passwordHeight: Math.round(document.querySelector('#login-password').getBoundingClientRect().height),
      submitHeight: Math.round(document.querySelector('.login-submit').getBoundingClientRect().height),
    }))

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
    expect(metrics.emailHeight).toBeGreaterThanOrEqual(48)
    expect(metrics.passwordHeight).toBeGreaterThanOrEqual(48)
    expect(metrics.submitHeight).toBeGreaterThanOrEqual(48)
  })
})
