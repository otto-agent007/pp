alter table public.profiles
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive'));

create index if not exists profiles_role_status_idx on public.profiles(role, status);
