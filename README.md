# ARC User Management

ARC dealer-account dashboard built with:

- JavaScript and React 19
- Next.js App Router for pages and Node.js API route handlers
- PostgreSQL/Supabase SQL migrations
- Global CSS for the screenshot-matched interface
- Node's built-in test runner and Playwright

## Local development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Without database environment variables,
it uses the five reference dealers from an in-memory development repository.

## Live data

Both dashboards read every number from PostgreSQL. Nothing on screen is a fixed
literal: stat cards, tab counts, filter dropdowns, pagination totals, dates and
the header's notification badge are all queries.

Each screen loads its whole view in one request:

```
/api/dealers?code=&name=&region=&zone=&territory=&q=&page=1&pageSize=10
→ { dealers, total, page, pageSize, stats, facets, notifications, syncedAt }

/api/tickets?dealerCode=&region=&chatType=&fromDate=&toDate=&tab=pending&query=&page=1
→ { tickets, total, page, pageSize, counts, facets, availableTags, syncedAt }
```

Support writes persist through their own endpoints — `POST
/api/tickets/:id/messages` for a reply, `PATCH /api/tickets/:id` for the status,
`POST /api/tickets/:id/tags` to toggle a tag — so replies survive a reload and
are visible to other agents.

Both pages re-read whenever filters or the page change, after every write, when
the tab regains focus, and on a background interval (`NEXT_PUBLIC_ARC_POLL_MS`,
10s by default). The breadcrumb shows the last sync time.

## Migrations

Apply both files through the Supabase CLI or SQL editor:

```
supabase/migrations/202607240001_create_dealers.sql
supabase/migrations/202608010001_create_support_tickets.sql
```

## Supabase database

Copy `.env.example` to `.env.local` and set the Supabase pooled PostgreSQL
connection string:

```bash
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Apply the migrations listed above through the Supabase CLI or SQL editor before
connecting the app.

## Verification

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
