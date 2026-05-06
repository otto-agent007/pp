create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  assigned_tech_id uuid references public.profiles(id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'en_route', 'in_progress', 'completed', 'canceled')),
  service_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_end >= scheduled_start)
);

create index if not exists jobs_customer_id_idx on public.jobs(customer_id);
create index if not exists jobs_location_id_idx on public.jobs(location_id);
create index if not exists jobs_assigned_tech_id_idx on public.jobs(assigned_tech_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_scheduled_start_idx on public.jobs(scheduled_start);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

drop policy if exists "admins manage jobs" on public.jobs;
create policy "admins manage jobs"
on public.jobs
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read assigned jobs" on public.jobs;
create policy "technicians read assigned jobs"
on public.jobs
for select
using (assigned_tech_id = auth.uid());

drop policy if exists "technicians update assigned jobs" on public.jobs;
create policy "technicians update assigned jobs"
on public.jobs
for update
using (assigned_tech_id = auth.uid())
with check (assigned_tech_id = auth.uid());
