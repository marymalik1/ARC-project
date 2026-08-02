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
DATABASE_CA_CERT=supabase/prod-ca-2021.crt
```

Supabase serves its pooler behind a private root CA that Node does not trust by
default, so `DATABASE_CA_CERT` supplies that root and certificate verification
stays on. Download your own copy from **Project Settings → Database → SSL
Configuration** to confirm the committed PEM.

Then apply the migrations:

```bash
npm run migrate
```

The app reports which backend it is using — `curl localhost:3000/api/dealers`
returns `"source": "database"` when connected and `"source": "memory"` when
falling back to the in-memory development repository.

## Message attachments

Files attached to a support message go to Supabase Storage; the database keeps
only the object key and the original name. Create the bucket once:

**Supabase → Storage → New bucket**, named `support-attachments`, and leave
**Public bucket** off. It must stay private: attachments are streamed back
through `/api/tickets/[id]/attachments/[messageId]`, which checks the reader's
session on every request, so nothing is reachable by URL alone.

Then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`).
Without them the app runs normally and the paperclip reports that attachments
are not configured. Uploads are capped at 5 MB and limited to images, PDFs,
plain text/CSV and Office documents — see `src/lib/attachments.js`.

## Verification

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
