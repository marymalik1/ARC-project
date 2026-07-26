# ARC Demo Login Design

## Goal

Add a polished, responsive demo login experience that gates the existing User
Management and Customer Care pages without introducing a real identity
provider.

## Demo Credentials

- Email: `admin@arcfarm.com`
- Password: `Arc@123`
- The credentials are fixed demonstration values and must be identified as
  sample credentials in the interface.
- The feature must be clearly treated as a demo gate, not production
  authentication.

## Routes and Session Flow

- Add `/login` as the public entry route.
- Submit credentials to a dedicated demo-auth Route Handler.
- On valid credentials, set an HTTP-only, same-site demo session cookie and
  redirect to `/`.
- On invalid credentials, return to `/login` with an inline error while never
  echoing the submitted password.
- Use the Next.js 16 `proxy.js` convention for an optimistic cookie check on
  `/` and `/customer-care`.
- Redirect unauthenticated page requests to `/login`.
- Redirect authenticated requests for `/login` to `/`.
- Make Logout submit to a demo-auth Route Handler that deletes the cookie and
  redirects to `/login`.
- Keep API authorization outside this demo feature's scope; this is not a
  security boundary.

## Login Interface

- Use the existing Arc farm intelligence SVG asset.
- Present a dark brand panel and a white sign-in panel on desktop.
- Include labeled email and password inputs, a password visibility control,
  submit button, sample-credential hint, and invalid-credential alert.
- Use the current black, white, and red visual system so the page feels native
  to the dashboard.
- Keep copy concise and administrative in tone.
- Add login-specific metadata.

## Responsive Behavior

- At tablet and mobile widths, collapse to a single-column layout.
- Keep the brand visible without consuming most of the first viewport.
- Keep form controls and the submit button at least 48 pixels high.
- Fit within a 390-by-844 viewport without document-level horizontal overflow.
- Keep the sample credentials readable and selectable.

## Accessibility

- Associate every input with a visible label.
- Give the password visibility button a state-specific accessible name.
- Announce invalid credentials through a visible `role="alert"` message.
- Preserve keyboard submission and visible focus styles.
- Keep the logo alternative text as `Arc farm intelligence`.
- Respect the existing reduced-motion behavior.

## Error Handling

- Empty or incorrect credentials use the same generic message: `Invalid email
  or password.`
- Unexpected submission failures show: `Unable to sign in right now.`
- Never store the password in a cookie, browser storage, URL, or rendered error.

## Verification

- Add unit coverage for credential validation and session-cookie helpers.
- Add Playwright coverage for protected-route redirects, successful login,
  invalid credentials, password visibility, and logout.
- Add a 390-by-844 browser check for horizontal overflow and control sizing.
- Run the complete unit suite, browser suite, linter, and production build.
- Inspect desktop and mobile screenshots for the login page and verify the
  existing dashboard remains visually unchanged after sign-in.
