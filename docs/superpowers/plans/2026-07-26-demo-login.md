# ARC Demo Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive sample-credential login that sets an HTTP-only demo session, gates the two dashboard pages, and supports logout.

**Architecture:** Keep credential and session constants in a pure library that can be unit tested. Use App Router Route Handlers to create and clear the cookie, Next.js 16 `proxy.js` for optimistic page redirects, a client login form only for password visibility, and a server login page for query-string error rendering.

**Tech Stack:** Next.js 16 App Router, React 19, JavaScript, CSS, Node test runner, Playwright

## Global Constraints

- Demo email must be exactly `admin@arcfarm.com`.
- Demo password must be exactly `Arc@123`.
- The session cookie must be HTTP-only, same-site `lax`, path `/`, and secure in production.
- The password must never be placed in a cookie, browser storage, URL, or rendered error.
- `/login` is public; `/` and `/customer-care` require the demo session.
- Authenticated `/login` requests redirect to `/`.
- API authorization remains outside this demo feature.
- The login page must fit a 390-by-844 viewport without horizontal overflow.
- Login controls must be at least 48 pixels high.
- Preserve the existing dashboard appearance and all unrelated working-tree changes.

---

### Task 1: Add demo credential and session helpers

**Files:**
- Create: `src/lib/demo-auth.js`
- Create: `tests/demo-auth.test.js`

**Interfaces:**
- Produces: `DEMO_EMAIL`, `DEMO_PASSWORD`, `SESSION_COOKIE`, `SESSION_VALUE`, `validateDemoCredentials(email, password)`, `hasDemoSession(value)`, and `demoCookieOptions()`.
- Consumed by: login/logout Route Handlers and `src/proxy.js`.

- [ ] **Step 1: Write the failing helper tests**

Create `tests/demo-auth.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  SESSION_COOKIE,
  SESSION_VALUE,
  demoCookieOptions,
  hasDemoSession,
  validateDemoCredentials,
} from '../src/lib/demo-auth.js'

test('accepts only the documented demo credentials', () => {
  assert.equal(validateDemoCredentials(DEMO_EMAIL, DEMO_PASSWORD), true)
  assert.equal(validateDemoCredentials(` ${DEMO_EMAIL.toUpperCase()} `, DEMO_PASSWORD), true)
  assert.equal(validateDemoCredentials(DEMO_EMAIL, 'wrong-password'), false)
  assert.equal(validateDemoCredentials('other@example.com', DEMO_PASSWORD), false)
})

test('recognizes only the demo session value', () => {
  assert.equal(SESSION_COOKIE, 'arc_demo_session')
  assert.equal(hasDemoSession(SESSION_VALUE), true)
  assert.equal(hasDemoSession('expired'), false)
  assert.equal(hasDemoSession(undefined), false)
})

test('uses constrained cookie options', () => {
  const options = demoCookieOptions()

  assert.equal(options.httpOnly, true)
  assert.equal(options.sameSite, 'lax')
  assert.equal(options.path, '/')
  assert.equal(options.maxAge, 60 * 60 * 8)
})
```

- [ ] **Step 2: Run the helper tests and verify the red state**

Run:

```bash
node --test tests/demo-auth.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/demo-auth.js`.

- [ ] **Step 3: Implement the helper library**

Create `src/lib/demo-auth.js`:

```js
export const DEMO_EMAIL = 'admin@arcfarm.com'
export const DEMO_PASSWORD = 'Arc@123'
export const SESSION_COOKIE = 'arc_demo_session'
export const SESSION_VALUE = 'authenticated'

export function validateDemoCredentials(email, password) {
  return (
    typeof email === 'string'
    && typeof password === 'string'
    && email.trim().toLowerCase() === DEMO_EMAIL
    && password === DEMO_PASSWORD
  )
}

export function hasDemoSession(value) {
  return value === SESSION_VALUE
}

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  }
}
```

- [ ] **Step 4: Run the helper tests and verify the green state**

Run:

```bash
node --test tests/demo-auth.test.js
```

Expected: PASS with three passing tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/demo-auth.js tests/demo-auth.test.js
git commit -m "feat: add demo session helpers"
```

### Task 2: Gate dashboard pages with the demo session

**Files:**
- Create: `src/proxy.js`
- Create: `src/app/api/demo-auth/login/route.js`
- Create: `src/app/api/demo-auth/logout/route.js`
- Create: `tests/e2e/authenticated-test.js`
- Modify: `tests/e2e/user-management.spec.js:1`
- Modify: `tests/e2e/customer-care.spec.js:1`
- Modify: `tests/e2e/mobile-responsive.spec.js:1`
- Create: `tests/e2e/login.spec.js`

**Interfaces:**
- Consumes: the demo-auth helpers from Task 1.
- Produces: POST `/api/demo-auth/login`, POST `/api/demo-auth/logout`, and `proxy(request)` for `/`, `/customer-care/:path*`, and `/login`.
- Test helper: exports authenticated `test` and `expect` fixtures for existing dashboard specs.

- [ ] **Step 1: Add the failing route-protection tests**

Create `tests/e2e/login.spec.js`:

```js
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
```

- [ ] **Step 2: Run the protection tests and verify the red state**

Run:

```bash
npx playwright test tests/e2e/login.spec.js
```

Expected: the unauthenticated redirect test FAILS because `/` is still public.

- [ ] **Step 3: Add the authenticated fixture for existing dashboard tests**

Create `tests/e2e/authenticated-test.js`:

```js
import { expect, test as base } from '@playwright/test'

const test = base.extend({
  page: async ({ context, page }, use) => {
    await context.addCookies([{
      name: 'arc_demo_session',
      value: 'authenticated',
      url: 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    }])
    await use(page)
  },
})

export { expect, test }
```

Change the first import in the three existing browser spec files to:

```js
import { expect, test } from './authenticated-test.js'
```

- [ ] **Step 4: Add the login Route Handler**

Create `src/app/api/demo-auth/login/route.js`:

```js
import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  SESSION_VALUE,
  demoCookieOptions,
  validateDemoCredentials,
} from '../../../../lib/demo-auth'

export async function POST(request) {
  try {
    const form = await request.formData()
    const email = form.get('email')
    const password = form.get('password')

    if (!validateDemoCredentials(email, password)) {
      return NextResponse.redirect(new URL('/login?error=invalid', request.url), {
        status: 303,
      })
    }

    const response = NextResponse.redirect(new URL('/', request.url), {
      status: 303,
    })
    response.cookies.set(SESSION_COOKIE, SESSION_VALUE, demoCookieOptions())
    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=unavailable', request.url), {
      status: 303,
    })
  }
}
```

- [ ] **Step 5: Add the logout Route Handler**

Create `src/app/api/demo-auth/logout/route.js`:

```js
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, demoCookieOptions } from '../../../../lib/demo-auth'

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/login', request.url), {
    status: 303,
  })
  response.cookies.set(SESSION_COOKIE, '', {
    ...demoCookieOptions(),
    maxAge: 0,
  })
  return response
}
```

- [ ] **Step 6: Add the Next.js 16 page gate**

Create `src/proxy.js`:

```js
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, hasDemoSession } from './lib/demo-auth'

export function proxy(request) {
  const { pathname } = request.nextUrl
  const authenticated = hasDemoSession(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === '/login') {
    return authenticated
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  }

  return authenticated
    ? NextResponse.next()
    : NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/', '/customer-care/:path*', '/login'],
}
```

- [ ] **Step 7: Run the protection tests and verify the green state**

Run:

```bash
npx playwright test tests/e2e/login.spec.js
```

Expected: PASS with two passing tests.

- [ ] **Step 8: Run the existing browser tests with the authenticated fixture**

Run:

```bash
npx playwright test tests/e2e/user-management.spec.js tests/e2e/customer-care.spec.js tests/e2e/mobile-responsive.spec.js
```

Expected: every existing test passes behind the demo session gate.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/proxy.js src/app/api/demo-auth tests/e2e/authenticated-test.js tests/e2e/login.spec.js tests/e2e/user-management.spec.js tests/e2e/customer-care.spec.js tests/e2e/mobile-responsive.spec.js
git commit -m "feat: gate dashboard with demo session"
```

### Task 3: Build the responsive login interface and logout control

**Files:**
- Create: `src/app/login/page.jsx`
- Create: `src/components/LoginForm.jsx`
- Create: `src/app/login.css`
- Modify: `src/app/layout.jsx:1-3`
- Modify: `src/components/Sidebar.jsx:35-42`
- Modify: `tests/e2e/login.spec.js`

**Interfaces:**
- Consumes: POST `/api/demo-auth/login`, POST `/api/demo-auth/logout`, `/login?error=invalid`, and `/login?error=unavailable`.
- Produces: accessible `/login` form, password visibility control, sample credential hint, and POST-based Logout control.

- [ ] **Step 1: Add the failing login-interface tests**

Append to `tests/e2e/login.spec.js`:

```js
test('signs in with the sample credentials', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('img', { name: 'Arc farm intelligence' })).toBeVisible()
  await expect(page.getByText('admin@arcfarm.com')).toBeVisible()
  await expect(page.getByText('Arc@123')).toBeVisible()

  await page.getByLabel('Email address').fill('admin@arcfarm.com')
  await page.getByLabel('Password').fill('Arc@123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
})

test('shows a generic error for invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('admin@arcfarm.com')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page).toHaveURL(/\/login\?error=invalid$/)
})

test('shows a safe fallback for an unavailable login submission', async ({ page }) => {
  await page.goto('/login?error=unavailable')

  await expect(page.getByRole('alert')).toHaveText(
    'Unable to sign in right now.',
  )
})

test('toggles password visibility', async ({ page }) => {
  await page.goto('/login')
  const password = page.getByLabel('Password')

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

  await expect(page).toHaveURL(/\/login$/)
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
```

- [ ] **Step 2: Run the interface tests and verify the red state**

Run:

```bash
npx playwright test tests/e2e/login.spec.js --grep "signs in|invalid credentials|password visibility|logs out|mobile viewport"
```

Expected: FAIL because `/login` has no form or interface yet.

- [ ] **Step 3: Create the client login form**

Create `src/components/LoginForm.jsx`:

```jsx
'use client'

import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'

export default function LoginForm({ errorMessage = '' }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="login-form" action="/api/demo-auth/login" method="post">
      {errorMessage && (
        <p className="login-error" role="alert">{errorMessage}</p>
      )}
      <label htmlFor="login-email">Email address</label>
      <div className="login-input">
        <Mail aria-hidden="true" />
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Enter your email"
          required
        />
      </div>
      <label htmlFor="login-password">Password</label>
      <div className="login-input">
        <LockKeyhole aria-hidden="true" />
        <input
          id="login-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      <button className="login-submit" type="submit">Sign in</button>
    </form>
  )
}
```

- [ ] **Step 4: Create the login page**

Create `src/app/login/page.jsx`:

```jsx
import LoginForm from '../../components/LoginForm'

export const metadata = {
  title: 'Sign in — ARC Administration',
  description: 'Demo sign in for ARC farm intelligence administration',
}

export default async function LoginPage({ searchParams }) {
  const { error } = await searchParams
  const errorMessage =
    error === 'invalid'
      ? 'Invalid email or password.'
      : error === 'unavailable'
        ? 'Unable to sign in right now.'
        : ''

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="ARC farm intelligence">
        <img src="/assets/arc-farm-intelligence.svg" alt="Arc farm intelligence" />
        <div>
          <p>Farm operations, made clearer.</p>
          <span>Administration portal</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="login-eyebrow">Welcome back</p>
          <h1>Sign in to your account</h1>
          <p className="login-intro">Access dealer management and customer support.</p>
          <LoginForm errorMessage={errorMessage} />
          <aside className="demo-credentials" aria-label="Sample credentials">
            <strong>Sample credentials</strong>
            <span>Email: <code>admin@arcfarm.com</code></span>
            <span>Password: <code>Arc@123</code></span>
          </aside>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Load the login stylesheet**

Add after the existing global imports in `src/app/layout.jsx`:

```jsx
import './login.css'
```

- [ ] **Step 6: Create the responsive login styles**

Create `src/app/login.css`:

```css
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(320px, 0.92fr) minmax(520px, 1.08fr);
  background: #ffffff;
}

.login-brand {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(36px, 5vw, 76px);
  color: #ffffff;
  background:
    radial-gradient(circle at 85% 82%, rgba(239, 54, 46, 0.2), transparent 36%),
    #050505;
}

.login-brand::after {
  content: "";
  position: absolute;
  z-index: -1;
  right: -190px;
  bottom: -220px;
  width: 520px;
  height: 520px;
  border: 1px solid rgba(239, 54, 46, 0.35);
  border-radius: 50%;
  box-shadow:
    0 0 0 52px rgba(239, 54, 46, 0.035),
    0 0 0 104px rgba(239, 54, 46, 0.02);
}

.login-brand img {
  width: min(100%, 430px);
  height: auto;
}

.login-brand > div {
  max-width: 510px;
}

.login-brand > div::before {
  content: "";
  display: block;
  width: 42px;
  height: 4px;
  margin-bottom: 22px;
  border-radius: 999px;
  background: #ef362e;
}

.login-brand p {
  margin: 0 0 14px;
  font-size: clamp(32px, 4vw, 58px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.login-brand span {
  color: rgba(255, 255, 255, 0.66);
  font-size: 15px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-panel {
  display: grid;
  place-items: center;
  padding: clamp(28px, 5vw, 72px);
  background:
    linear-gradient(rgba(239, 54, 46, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(239, 54, 46, 0.035) 1px, transparent 1px),
    #ffffff;
  background-size: 36px 36px;
}

.login-card {
  width: min(100%, 460px);
  padding: clamp(28px, 4vw, 44px);
  border: 1px solid #e7e7e7;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 70px rgba(25, 28, 32, 0.1);
}

.login-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  color: #df2f28;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.login-eyebrow::before {
  content: "";
  width: 20px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.login-card h1 {
  margin: 0;
  color: #17191c;
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.login-intro {
  margin: 12px 0 30px;
  color: #65696f;
  font-size: 15px;
  line-height: 1.6;
}

.login-form {
  display: grid;
  gap: 18px;
}

.login-form label {
  display: grid;
  gap: 8px;
  color: #272a2e;
  font-size: 13px;
  font-weight: 750;
}

.login-input {
  min-height: 56px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 10px;
  padding: 0 8px 0 16px;
  border: 1px solid #d8dadd;
  border-radius: 14px;
  color: #787d83;
  background: #ffffff;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.login-input:focus-within {
  border-color: #ef362e;
  box-shadow: 0 0 0 4px rgba(239, 54, 46, 0.11);
}

.login-input input {
  width: 100%;
  min-width: 0;
  height: 52px;
  border: 0;
  outline: 0;
  color: #17191c;
  font: inherit;
  background: transparent;
}

.login-input input::placeholder {
  color: #a1a4a8;
}

.password-toggle {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  color: #686c72;
  background: transparent;
  cursor: pointer;
}

.password-toggle:hover {
  color: #17191c;
  background: #f4f4f4;
}

.login-error {
  margin: -2px 0 0;
  padding: 12px 14px;
  border: 1px solid #f3c1be;
  border-radius: 12px;
  color: #a9221c;
  font-size: 13px;
  line-height: 1.45;
  background: #fff3f2;
}

.login-submit {
  width: 100%;
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 14px;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  background: #ef362e;
  box-shadow: 0 12px 24px rgba(239, 54, 46, 0.22);
  cursor: pointer;
  transition:
    transform 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.login-submit:hover {
  transform: translateY(-1px);
  background: #d92d26;
  box-shadow: 0 15px 28px rgba(239, 54, 46, 0.27);
}

.login-submit:active {
  transform: translateY(0);
}

.demo-credentials {
  margin-top: 26px;
  padding: 17px 18px;
  border: 1px dashed #d6d8da;
  border-radius: 14px;
  background: #fafafa;
}

.demo-credentials strong {
  display: block;
  margin-bottom: 10px;
  color: #272a2e;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.demo-credentials span {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  color: #74787e;
  font-size: 13px;
}

.demo-credentials span + span {
  margin-top: 7px;
}

.demo-credentials code {
  overflow-wrap: anywhere;
  color: #272a2e;
  font-family: inherit;
  font-weight: 750;
  text-align: right;
}

.logout-form {
  margin: 0;
}

.logout-form .logout-link {
  width: 100%;
  border: 0;
  font: inherit;
  cursor: pointer;
}

@media (max-width: 840px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-brand {
    min-height: 240px;
    gap: 50px;
    padding: 30px clamp(24px, 7vw, 48px);
  }

  .login-brand img {
    width: min(100%, 330px);
  }

  .login-panel {
    align-items: start;
    padding: 32px clamp(20px, 6vw, 48px) 52px;
  }
}

@media (max-width: 560px) {
  .login-brand {
    min-height: 184px;
    gap: 34px;
    padding: 24px 20px 26px;
  }

  .login-brand::after {
    right: -240px;
    bottom: -310px;
  }

  .login-brand img {
    width: min(100%, 270px);
  }

  .login-brand > div::before,
  .login-brand span {
    display: none;
  }

  .login-brand p {
    max-width: 310px;
    margin: 0;
    font-size: 30px;
  }

  .login-panel {
    place-items: start stretch;
    padding: 24px 16px 40px;
    background-size: 28px 28px;
  }

  .login-card {
    width: 100%;
    padding: 26px 20px;
    border-radius: 20px;
  }

  .login-card h1 {
    font-size: 34px;
  }

  .login-intro {
    margin-bottom: 24px;
  }

  .demo-credentials span {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .demo-credentials code {
    text-align: left;
  }
}
```

- [ ] **Step 7: Replace the placeholder logout link with a POST form**

In `src/components/Sidebar.jsx`, replace the `#logout` anchor with:

```jsx
<form className="logout-form" action="/api/demo-auth/logout" method="post">
  <button className="nav-item logout-link" type="submit">
    <LogOut aria-hidden="true" />
    <span>Logout</span>
  </button>
</form>
```

- [ ] **Step 8: Run the interface tests and verify the green state**

Run:

```bash
npx playwright test tests/e2e/login.spec.js
```

Expected: every login, error, visibility, logout, protection, and mobile test passes.

- [ ] **Step 9: Run the full automated verification suite**

Run:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Expected: every command exits with status 0 and reports no failed tests or lint errors.

- [ ] **Step 10: Inspect desktop and mobile screenshots**

Inspect `/login` at 1440 by 1000 and 390 by 844. Confirm the SVG is complete, the form is visually balanced, the sample credentials are readable, controls do not clip, focus states are visible, and there is no framework error overlay. Sign in and confirm the existing dashboard presentation is unchanged.

- [ ] **Step 11: Commit Task 3**

```bash
git add src/app/login src/components/LoginForm.jsx src/app/login.css src/app/layout.jsx src/components/Sidebar.jsx tests/e2e/login.spec.js
git commit -m "feat: add responsive demo login"
```
