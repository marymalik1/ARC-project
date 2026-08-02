-- Lets a support message carry one file.
--
-- The bytes live in Supabase Storage, never in Postgres: these columns only
-- record where the object is and what it was called, so the thread can render a
-- link without the database growing by the size of every screenshot.
--
-- One attachment per message rather than a child table — the composer sends one
-- file with one message. A message needing several would want its own table.
--
-- npm run migrate replays every file in this directory, so each statement has to
-- be safe to run more than once.

alter table public.support_ticket_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

-- A message is now allowed to be an attachment with no words, but not empty in
-- both: `body` stays not-null and carries '' in that case.
alter table public.support_ticket_messages
  drop constraint if exists support_messages_content_check;

alter table public.support_ticket_messages
  add constraint support_messages_content_check
  check (length(btrim(body)) > 0 or attachment_path is not null);
