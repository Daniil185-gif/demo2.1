-- Выполнить целиком в Supabase → SQL Editor.
create table if not exists public.requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  status text not null default 'new' check (status in ('new','agreed','done','cancelled')),
  data jsonb not null default '{}'::jsonb
);
create index if not exists requests_created_at_idx on public.requests (created_at desc);
create index if not exists requests_status_idx on public.requests (status);
create table if not exists public.settings (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.requests enable row level security;
alter table public.settings enable row level security;
revoke all on public.requests from anon, authenticated;
revoke all on public.settings from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos','request-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Единственный владелец конкретной установки сайта.
-- Запись id=1 создаётся автоматически при первой настройке кабинета.
create table if not exists public.owners (
  id integer primary key check (id = 1),
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.owners enable row level security;
revoke all on public.owners from anon, authenticated;
