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

## Supabase database

Copy `.env.example` to `.env.local` and set the Supabase pooled PostgreSQL
connection string:

```bash
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

Apply `supabase/migrations/202607240001_create_dealers.sql` through the Supabase
CLI or SQL editor before connecting the app.

## Verification

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```
