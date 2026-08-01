create table if not exists public.support_tickets (
  id text primary key,
  subject text not null,
  priority text not null default 'Medium',
  status text not null default 'Pending',
  chat_type text not null,
  region text not null,
  zone text not null,
  territory text not null,
  channel text not null default 'Portal',
  assigned_to text not null,
  preview text not null default '',
  customer_name text not null,
  customer_dealer_code text not null,
  customer_location text not null,
  customer_phone text not null,
  customer_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_id_format_check check (id ~ '^TKT-[0-9]{6}$'),
  constraint support_tickets_status_check check (status in ('Pending', 'Closed')),
  constraint support_tickets_priority_check check (priority in ('High', 'Medium', 'Low'))
);

create table if not exists public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id text not null references public.support_tickets (id) on delete cascade,
  sender text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  constraint support_messages_sender_check check (sender in ('customer', 'agent'))
);

create table if not exists public.support_tags (
  name text primary key,
  sort_order integer not null default 0
);

create table if not exists public.support_ticket_tags (
  ticket_id text not null references public.support_tickets (id) on delete cascade,
  tag text not null references public.support_tags (name) on delete cascade,
  primary key (ticket_id, tag)
);

create index if not exists support_tickets_status_created_idx
  on public.support_tickets (status, created_at desc);

create index if not exists support_tickets_scope_idx
  on public.support_tickets (region, zone, territory, chat_type);

create index if not exists support_tickets_dealer_idx
  on public.support_tickets (customer_dealer_code);

create index if not exists support_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, sent_at asc);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_tags enable row level security;
alter table public.support_ticket_tags enable row level security;

drop policy if exists "authenticated users read tickets" on public.support_tickets;
create policy "authenticated users read tickets"
  on public.support_tickets for select to authenticated using (true);

drop policy if exists "authenticated users update tickets" on public.support_tickets;
create policy "authenticated users update tickets"
  on public.support_tickets for update to authenticated using (true) with check (true);

drop policy if exists "authenticated users read messages" on public.support_ticket_messages;
create policy "authenticated users read messages"
  on public.support_ticket_messages for select to authenticated using (true);

drop policy if exists "authenticated users write messages" on public.support_ticket_messages;
create policy "authenticated users write messages"
  on public.support_ticket_messages for insert to authenticated with check (true);

drop policy if exists "authenticated users read tags" on public.support_tags;
create policy "authenticated users read tags"
  on public.support_tags for select to authenticated using (true);

drop policy if exists "authenticated users read ticket tags" on public.support_ticket_tags;
create policy "authenticated users read ticket tags"
  on public.support_ticket_tags for select to authenticated using (true);

drop policy if exists "authenticated users write ticket tags" on public.support_ticket_tags;
create policy "authenticated users write ticket tags"
  on public.support_ticket_tags for insert to authenticated with check (true);

drop policy if exists "authenticated users remove ticket tags" on public.support_ticket_tags;
create policy "authenticated users remove ticket tags"
  on public.support_ticket_tags for delete to authenticated using (true);

grant select, update on public.support_tickets to authenticated;
grant select, insert on public.support_ticket_messages to authenticated;
grant select on public.support_tags to authenticated;
grant select, insert, delete on public.support_ticket_tags to authenticated;
grant usage, select on sequence public.support_ticket_messages_id_seq to authenticated;

insert into public.support_tags (name, sort_order)
values
  ('Login Issue', 1),
  ('High Priority', 2),
  ('Follow Up', 3)
on conflict (name) do update set sort_order = excluded.sort_order;

insert into public.support_tickets (
  id, subject, priority, status, chat_type, region, zone, territory,
  channel, assigned_to, preview,
  customer_name, customer_dealer_code, customer_location, customer_phone, customer_email,
  created_at
)
values
  (
    'TKT-000321', 'Unable to login to the ARC portal', 'High', 'Pending', 'Login Issue',
    'North', 'North Zone', 'Lahore City', 'Portal', 'Maryam',
    'Hello, I am unable to login to the ARC portal.',
    'Ali Traders', 'D00123', 'Lahore, North Zone, Lahore City', '0300-1234567',
    'ali.traders@gmail.com', '2025-05-18 10:30:00+05'
  ),
  (
    'TKT-000320', 'Report not generating', 'Medium', 'Pending', 'Report Issue',
    'South', 'South Zone', 'Karachi South', 'Portal', 'Maryam',
    'The monthly report is not generating.',
    'Khan Associates', 'D00124', 'Karachi, South Zone, Karachi South', '0301-2345678',
    'khan.associates@gmail.com', '2025-05-18 09:45:00+05'
  ),
  (
    'TKT-000319', 'Incorrect ledger amount', 'High', 'Pending', 'Ledger Issue',
    'Central', 'Central Zone', 'Islamabad East', 'Portal', 'Maryam',
    'The ledger amount does not match our records.',
    'Usman Enterprises', 'D00125', 'Islamabad, Central Zone, Islamabad East', '0302-3456789',
    'usman.enterprises@gmail.com', '2025-05-17 15:20:00+05'
  ),
  (
    'TKT-000318', 'Product expired on dashboard', 'Medium', 'Pending', 'Product Issue',
    'North', 'North Zone', 'Sheikhupura', 'Portal', 'Maryam',
    'An active product is shown as expired.',
    'Raza Enterprises', 'D00126', 'Lahore, North Zone, Sheikhupura', '0303-4567890',
    'raza.enterprises@gmail.com', '2025-05-17 12:15:00+05'
  ),
  (
    'TKT-000317', 'Export file is blank', 'Low', 'Closed', 'Export Issue',
    'West', 'West Zone', 'Peshawar City', 'Portal', 'Maryam',
    'The downloaded export file contains no rows.',
    'Bilal & Sons', 'D00127', 'Peshawar, West Zone, Peshawar City', '0304-5678901',
    'bilal.sons@gmail.com', '2025-05-16 11:10:00+05'
  )
on conflict (id) do update
set subject = excluded.subject,
    priority = excluded.priority,
    chat_type = excluded.chat_type,
    region = excluded.region,
    zone = excluded.zone,
    territory = excluded.territory,
    channel = excluded.channel,
    assigned_to = excluded.assigned_to,
    preview = excluded.preview,
    customer_name = excluded.customer_name,
    customer_dealer_code = excluded.customer_dealer_code,
    customer_location = excluded.customer_location,
    customer_phone = excluded.customer_phone,
    customer_email = excluded.customer_email,
    created_at = excluded.created_at,
    updated_at = now();

insert into public.support_ticket_messages (ticket_id, sender, body, sent_at)
select seed.ticket_id, seed.sender, seed.body, seed.sent_at
from (
  values
    ('TKT-000321', 'customer', 'Hello, I am unable to login to the ARC portal. It shows invalid credentials.', '2025-05-18 10:30:00+05'::timestamptz),
    ('TKT-000321', 'agent', 'Hi Ali, I''m sorry you''re facing this issue. Could you please confirm your registered email address?', '2025-05-18 10:32:00+05'),
    ('TKT-000321', 'customer', 'ali.traders@gmail.com', '2025-05-18 10:33:00+05'),
    ('TKT-000321', 'agent', 'Thanks! Please try resetting your password. I''ve sent you a reset link on your email.', '2025-05-18 10:34:00+05'),
    ('TKT-000321', 'customer', 'It worked! Thank you so much.', '2025-05-18 10:35:00+05'),
    ('TKT-000320', 'customer', 'The monthly report is not generating. The report button keeps loading.', '2025-05-18 09:45:00+05'),
    ('TKT-000320', 'agent', 'I am checking the reporting service now.', '2025-05-18 09:48:00+05'),
    ('TKT-000319', 'customer', 'The ledger amount does not match the amount in our statement.', '2025-05-17 15:20:00+05'),
    ('TKT-000318', 'customer', 'One of our active products is shown as expired on the dashboard.', '2025-05-17 12:15:00+05'),
    ('TKT-000317', 'customer', 'The export has headers only and no data rows.', '2025-05-16 11:10:00+05'),
    ('TKT-000317', 'agent', 'The export service was refreshed and the corrected file was sent.', '2025-05-16 11:18:00+05')
) as seed (ticket_id, sender, body, sent_at)
where not exists (
  select 1
  from public.support_ticket_messages existing
  where existing.ticket_id = seed.ticket_id
    and existing.sent_at = seed.sent_at
);
