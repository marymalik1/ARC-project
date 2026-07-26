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
