alter table public.locations
add column if not exists latitude numeric,
add column if not exists longitude numeric;

alter table public.locations
drop constraint if exists locations_latitude_range_check;

alter table public.locations
add constraint locations_latitude_range_check
check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.locations
drop constraint if exists locations_longitude_range_check;

alter table public.locations
add constraint locations_longitude_range_check
check (longitude is null or (longitude >= -180 and longitude <= 180));

create table if not exists public.job_location_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  event_type text not null check (event_type in ('arrival', 'departure')),
  latitude numeric not null check (latitude >= -90 and latitude <= 90),
  longitude numeric not null check (longitude >= -180 and longitude <= 180),
  accuracy_m numeric check (accuracy_m is null or accuracy_m >= 0),
  distance_m numeric check (distance_m is null or distance_m >= 0),
  within_radius boolean,
  recorded_by uuid references auth.users(id) on delete set null,
  client_event_id uuid not null unique,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists job_location_events_job_id_idx
on public.job_location_events(job_id);

create index if not exists job_location_events_recorded_by_idx
on public.job_location_events(recorded_by);

create index if not exists job_location_events_captured_at_idx
on public.job_location_events(captured_at);

alter table public.job_location_events enable row level security;

drop policy if exists "admins manage job location events" on public.job_location_events;
create policy "admins manage job location events"
on public.job_location_events
for all
using (public.has_admin_access())
with check (public.has_admin_access());

drop policy if exists "technicians read assigned job location events" on public.job_location_events;
create policy "technicians read assigned job location events"
on public.job_location_events
for select
using (
  exists (
    select 1
    from public.jobs
    where jobs.id = job_location_events.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);

drop policy if exists "technicians insert assigned job location events" on public.job_location_events;
create policy "technicians insert assigned job location events"
on public.job_location_events
for insert
with check (
  recorded_by = auth.uid()
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_location_events.job_id
      and jobs.assigned_tech_id = auth.uid()
  )
);
