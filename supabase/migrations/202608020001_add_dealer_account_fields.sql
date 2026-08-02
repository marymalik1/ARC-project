-- Adds the account fields the FMC Partners spec's "Manage User" form captures,
-- plus the accountability columns behind "Created by" / "Verified by".
--
-- `created_by` and `verified_by` are plain text for now. There is no users table
-- yet, so they record a name rather than referencing one. When real sign-in
-- lands they should become foreign keys onto that table.
--
-- npm run migrate replays every file in this directory, so each statement has to
-- be safe to run more than once.

alter table public.dealers
  add column if not exists email text,
  add column if not exists store_code text,
  add column if not exists role text,
  add column if not exists verified boolean not null default false,
  add column if not exists verified_by text,
  add column if not exists verified_at timestamptz,
  add column if not exists created_by text;

-- Dealers that predate verification are treated as unverified rather than
-- silently approved, so the review queue starts out honest.
create index if not exists dealers_verified_idx
  on public.dealers (verified, created_at desc);
