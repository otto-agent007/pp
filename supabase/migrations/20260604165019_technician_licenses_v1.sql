create table if not exists public.technician_licenses (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id),
  license_type text not null
    check (
      license_type in (
        'applicator',
        'field_representative',
        'operator',
        'registered_company',
        'other'
      )
    ),
  branch text not null
    check (branch in ('branch_2', 'branch_3', 'general')),
  license_number text not null,
  issuing_authority text not null default 'spcb',
  status text not null
    check (
      status in (
        'active',
        'expiring_soon',
        'expired',
        'suspended',
        'unknown'
      )
    ),
  expires_at date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists technician_licenses_technician_id_idx
  on public.technician_licenses(technician_id);

create index if not exists technician_licenses_branch_idx
  on public.technician_licenses(branch);

create index if not exists technician_licenses_status_idx
  on public.technician_licenses(status);

create index if not exists technician_licenses_expires_at_idx
  on public.technician_licenses(expires_at);

drop trigger if exists technician_licenses_set_updated_at
  on public.technician_licenses;
create trigger technician_licenses_set_updated_at
before update on public.technician_licenses
for each row execute function public.set_updated_at();

alter table public.technician_licenses enable row level security;

revoke all on table public.technician_licenses from anon;
grant select, insert, update on table public.technician_licenses
  to authenticated;

drop policy if exists "technician licenses are readable by owner or admins"
  on public.technician_licenses;
create policy "technician licenses are readable by owner or admins"
on public.technician_licenses
for select
to authenticated
using (
  (
    technician_id = (select auth.uid())
    and archived_at is null
  )
  or (select private.has_admin_access())
);

drop policy if exists "admins insert technician licenses"
  on public.technician_licenses;
create policy "admins insert technician licenses"
on public.technician_licenses
for insert
to authenticated
with check ((select private.has_admin_access()));

drop policy if exists "admins update technician licenses"
  on public.technician_licenses;
create policy "admins update technician licenses"
on public.technician_licenses
for update
to authenticated
using ((select private.has_admin_access()))
with check ((select private.has_admin_access()));
