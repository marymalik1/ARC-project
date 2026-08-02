-- Real staff accounts. Until this table existed the session cookie held one
-- shared value, so "who created this account" could not be answered at all.
--
-- Roles drive the module access described in the FMC Partners spec. MASTER_ADMIN
-- has everything; the rest map to the departments listed there.

create table if not exists public.users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'CUSTOMER_SUPPORT',
  status text not null default 'Active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_role_check check (role in (
    'MASTER_ADMIN', 'ACCOUNTS', 'SALES', 'CUSTOMER_SUPPORT', 'MANAGEMENT'
  )),
  constraint users_status_check check (status in ('Active', 'Inactive'))
);

create index if not exists users_email_idx on public.users (lower(email));

-- The account the demo credentials already sign in with, so switching to real
-- sessions does not lock anyone out. The hash is scrypt over 'Arc@123' using the
-- scheme in src/lib/password.js — change it in the app, not here.
insert into public.users (name, email, password_hash, role, avatar_url)
values (
  'Maryam',
  'admin@arcfarm.com',
  'scrypt$b58ef4f01d65f35f754e5273ec2274a5$d8c323a5aaf6091d44d38d796dc83e0f74a261c997d289a52103181f26d054269b2d602327ec3b0ab59a87ea69e8a167461ab6215ff1cfb7ec4315fb753a7f13',
  'MASTER_ADMIN',
  '/assets/maryam-avatar.png'
)
on conflict (email) do nothing;

alter table public.users enable row level security;
