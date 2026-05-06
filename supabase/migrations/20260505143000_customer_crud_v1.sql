create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'dispatcher', 'technician')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  property_type text not null default 'residential' check (property_type in ('residential', 'commercial', 'other')),
  service_notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  address text not null,
  nickname text,
  service_notes text,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_customer_id_idx on public.locations(customer_id);
create index if not exists customers_status_idx on public.customers(status);
create index if not exists locations_status_idx on public.locations(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create or replace function public.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'dispatcher')
  );
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.locations enable row level security;

drop policy if exists "profiles are readable by owner or admins" on public.profiles;
create policy "profiles are readable by owner or admins"
on public.profiles
for select
using (id = auth.uid() or public.has_admin_access());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "admins manage customers" on public.customers;
create policy "admins manage customers"
on public.customers
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "admins manage locations" on public.locations;
create policy "admins manage locations"
on public.locations
for all
using (public.has_admin_access())
with check (public.has_admin_access());
