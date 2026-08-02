-- Stores the account password as a scrypt hash (see src/lib/password.js).
-- Never selected into the dealer read model, so it cannot reach the browser.
alter table public.dealers
  add column if not exists password_hash text;
