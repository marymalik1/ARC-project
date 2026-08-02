create extension if not exists pg_trgm with schema extensions;

create table if not exists public.dealers (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  region text not null,
  zone text not null,
  territory text not null,
  status text not null default 'Active',
  created_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealers_code_format_check check (code ~ '^D[0-9]{5}$'),
  constraint dealers_status_check check (status in ('Active', 'Inactive'))
);

create index if not exists dealers_region_zone_territory_idx
  on public.dealers (region, zone, territory);

create index if not exists dealers_status_created_on_idx
  on public.dealers (status, created_on desc);

create index if not exists dealers_name_search_idx
  on public.dealers using gin (lower(name) extensions.gin_trgm_ops);

alter table public.dealers enable row level security;

drop policy if exists "authenticated users can read dealers" on public.dealers;
create policy "authenticated users can read dealers"
  on public.dealers
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can create dealers" on public.dealers;
create policy "authenticated users can create dealers"
  on public.dealers
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated users can update dealers" on public.dealers;
create policy "authenticated users can update dealers"
  on public.dealers
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated users can delete dealers" on public.dealers;
create policy "authenticated users can delete dealers"
  on public.dealers
  for delete
  to authenticated
  using (true);

grant select, insert, update, delete on public.dealers to authenticated;
grant usage, select on sequence public.dealers_id_seq to authenticated;

-- created_at is set explicitly rather than defaulting to now(): the export shows
-- "Date and time Created" from it while the table shows created_on, and letting
-- it default made the same row read as two different dates.
insert into public.dealers (
  code,
  name,
  region,
  zone,
  territory,
  status,
  created_on,
  created_at
)
values
  ('D00123', 'Ali Traders', 'Lahore', 'North Zone', 'Lahore City', 'Active', '2025-05-18', '2025-05-18 09:15:00+05'),
  ('D00124', 'Khan Associates', 'Karachi', 'South Zone', 'Karachi South', 'Active', '2025-05-18', '2025-05-18 11:40:00+05'),
  ('D00125', 'Usman Enterprises', 'Islamabad', 'Central Zone', 'Islamabad East', 'Inactive', '2025-05-17', '2025-05-17 14:05:00+05'),
  ('D00126', 'Raza Enterprises', 'Lahore', 'North Zone', 'Sheikhupura', 'Active', '2025-05-17', '2025-05-17 16:20:00+05'),
  ('D00127', 'Bilal & Sons', 'Peshawar', 'West Zone', 'Peshawar City', 'Inactive', '2025-05-16', '2025-05-16 10:00:00+05')
on conflict (code) do update
set name = excluded.name,
    region = excluded.region,
    zone = excluded.zone,
    territory = excluded.territory,
    status = excluded.status,
    created_on = excluded.created_on,
    created_at = excluded.created_at,
    updated_at = now();
