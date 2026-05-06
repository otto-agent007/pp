create table if not exists public.chemical_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  epa_number text,
  current_stock numeric not null default 0 check (current_stock >= 0),
  unit text not null default 'oz' check (unit in ('oz', 'gal', 'lb', 'each')),
  reorder_level numeric check (reorder_level is null or reorder_level >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chemical_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  chemical_id uuid not null references public.chemical_inventory(id) on delete restrict,
  amount_used numeric not null check (amount_used > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists chemical_inventory_status_idx on public.chemical_inventory(status);
create index if not exists chemical_inventory_name_idx on public.chemical_inventory(name);
create index if not exists chemical_logs_job_id_idx on public.chemical_logs(job_id);
create index if not exists chemical_logs_chemical_id_idx on public.chemical_logs(chemical_id);
create index if not exists chemical_logs_created_at_idx on public.chemical_logs(created_at);

drop trigger if exists chemical_inventory_set_updated_at on public.chemical_inventory;
create trigger chemical_inventory_set_updated_at
before update on public.chemical_inventory
for each row execute function public.set_updated_at();

create or replace function public.deduct_chemical_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available_stock numeric;
begin
  select current_stock
  into available_stock
  from public.chemical_inventory
  where id = new.chemical_id
    and status = 'active'
  for update;

  if available_stock is null then
    raise exception 'Chemical inventory item is not active or does not exist';
  end if;

  if available_stock < new.amount_used then
    raise exception 'Insufficient chemical stock';
  end if;

  update public.chemical_inventory
  set current_stock = current_stock - new.amount_used
  where id = new.chemical_id;

  return new;
end;
$$;

drop trigger if exists chemical_logs_deduct_stock on public.chemical_logs;
create trigger chemical_logs_deduct_stock
before insert on public.chemical_logs
for each row execute function public.deduct_chemical_stock();

alter table public.chemical_inventory enable row level security;
alter table public.chemical_logs enable row level security;

drop policy if exists "admins manage chemical inventory" on public.chemical_inventory;
create policy "admins manage chemical inventory"
on public.chemical_inventory
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read active chemical inventory" on public.chemical_inventory;
create policy "technicians read active chemical inventory"
on public.chemical_inventory
for select
using (status = 'active');

drop policy if exists "admins manage chemical logs" on public.chemical_logs;
create policy "admins manage chemical logs"
on public.chemical_logs
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read assigned chemical logs" on public.chemical_logs;
create policy "technicians read assigned chemical logs"
on public.chemical_logs
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = chemical_logs.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "technicians insert assigned chemical logs" on public.chemical_logs;
create policy "technicians insert assigned chemical logs"
on public.chemical_logs
for insert
with check (
  exists (
    select 1
    from public.jobs
    where jobs.id = chemical_logs.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);
