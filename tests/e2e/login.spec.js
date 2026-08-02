import { expect, test } from '@playwright/test'

test('redirects unauthenticated dashboard requests to login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
})

test('allows a valid demo session to open the dashboard', async ({ context, page }) => {
  // Sessions are signed, so the cookie has to come from the sign-in route rather
  // than being written by hand.
  await context.request.post('/api/demo-auth/login', {
    form: { email: 'admin@arcfarm.com', password: 'Arc@123' },
    maxRedirects: 0,
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
})

test('refuses a forged or tampered session cookie', async ({ context, page }) => {
  await context.addCookies([{
    name: 'arc_demo_session',
    value: '1.99999999999999.forged-signature',
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)

  // A real token with the user id swapped must fail its signature too, or anyone
  // could sign in as any account by editing one number.
  const response = await context.request.post('/api/demo-auth/login', {
    form: { email: 'admin@arcfarm.com', password: 'Arc@123' },
    maxRedirects: 0,
  })
  const issued = /arc_demo_session=([^;]+)/.exec(response.headers()['set-cookie'])[1]
  const [, expiresAt, signature] = issued.split('.')

  await context.clearCookies()
  await context.addCookies([{
    name: 'arc_demo_session',
    value: `999.${expiresAt}.${signature}`,
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
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

  const cookie = response.headers()['set-cookie']
  // "<userId>.<expiresAt>.<hmac>" — never a guessable constant.
  expect(cookie).toMatch(/arc_demo_session=\d+\.\d+\.[\w-]+/)
  expect(cookie).not.toContain('arc_demo_session=authenticated')
  expect(cookie).toContain('HttpOnly')
  expect(cookie).toContain('SameSite=lax')
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

  await expect(page.getByRole('img', { name: 'FMC Partner — Growing Together' })).toBeVisible()
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
  await context.request.post('/api/demo-auth/login', {
    form: { email: 'admin@arcfarm.com', password: 'Arc@123' },
    maxRedirects: 0,
  })
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
