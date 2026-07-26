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
