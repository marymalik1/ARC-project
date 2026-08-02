import { expect, test as base } from '@playwright/test'

// Signs in for real rather than forging a cookie value. Sessions are signed now,
// so a hand-written cookie no longer verifies — and going through the sign-in
// route keeps this fixture honest about what a logged-in browser actually holds.
async function signIn(request) {
  const response = await request.post('/api/demo-auth/login', {
    form: { email: 'admin@arcfarm.com', password: 'Arc@123' },
    maxRedirects: 0,
  })

  if (response.status() !== 303) {
    throw new Error(`Test sign-in failed with status ${response.status()}`)
  }
}

const test = base.extend({
  // Overriding `context` rather than `page` so the built-in `page` fixture,
  // which derives from it, is signed in too.
  context: async ({ context }, run) => {
    await signIn(context.request)
    await run(context)
  },
  // API-only tests ask for `request`. Point it at the signed-in context so they
  // reach the endpoints that now require a session, instead of a bare 401.
  request: async ({ context }, run) => {
    await run(context.request)
  },
})

export { expect, test }
