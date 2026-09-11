-- Technician status boundary, from the 2026-09-10 security review.
--
-- private.has_admin_access() and private.is_admin() have required
-- profiles.status = 'active' since 2026-09-06, so deactivating an admin or a
-- dispatcher actually removes their access. The technician branches never got
-- the same treatment: every technician policy and both technician RPCs key on
-- `jobs.assigned_tech_id = auth.uid()` alone. A technician marked 'inactive'
-- therefore keeps reading and writing every job still assigned to them -- its
-- forms, media, chemical logs, unit audits and geofence trail -- until an admin
-- reassigns each job one at a time. Nothing bans the auth user, so their
-- refresh token keeps working.
--
-- The same predicate closes a second gap: the chemical inventory and form
-- template read policies were `has_admin_access() or status = 'active'`, with
-- no role test at all, so any signed-in account -- including one with no
-- profile row -- could read the active rows of both tables.

-- 1. The predicate. Deliberately status-only rather than role = 'technician':
--    the point is that a deactivated account loses access, and an admin who is
--    also assigned to a job must not be locked out of the technician branch.
--    An account with no profile row returns false, which is what closes the
--    inventory and form-template reads below.
create or replace function private.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
  );
$$;

revoke all on function private.has_active_profile() from public;
grant execute on function private.has_active_profile() to authenticated;

-- 2. Technician read/write branches. Each policy below is the live definition
--    with `(select private.has_active_profile())` added to the technician
--    branch only; the admin branch already enforces status through
--    private.has_admin_access().

drop policy if exists "jobs are readable by admins or assigned technicians" on public.jobs;
create policy "jobs are readable by admins or assigned technicians"
on public.jobs
for select
to authenticated
using (
  (select private.has_admin_access())
  or (
    assigned_tech_id = (select auth.uid())
    and (select private.has_active_profile())
  )
);

drop policy if exists "job media is readable by admins or assigned technicians" on public.job_media;
create policy "job media is readable by admins or assigned technicians"
on public.job_media
for select
to authenticated
using (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_media.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "job media is insertable by admins or assigned technicians" on public.job_media;
create policy "job media is insertable by admins or assigned technicians"
on public.job_media
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    uploaded_by = (select auth.uid())
    and storage_bucket = 'job-media'
    and storage_path like (job_id::text || '/%')
    and (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_media.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "job form submissions are readable by admins or assigned technicians"
  on public.job_form_submissions;
create policy "job form submissions are readable by admins or assigned technicians"
on public.job_form_submissions
for select
to authenticated
using (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_form_submissions.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "job form submissions are insertable by admins or assigned technicians"
  on public.job_form_submissions;
create policy "job form submissions are insertable by admins or assigned technicians"
on public.job_form_submissions
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    submitted_by = (select auth.uid())
    and (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_form_submissions.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "chemical logs are readable by admins or assigned technicians"
  on public.chemical_logs;
create policy "chemical logs are readable by admins or assigned technicians"
on public.chemical_logs
for select
to authenticated
using (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = chemical_logs.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "chemical logs are insertable by admins or assigned technicians"
  on public.chemical_logs;
create policy "chemical logs are insertable by admins or assigned technicians"
on public.chemical_logs
for insert
to authenticated
with check (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = chemical_logs.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "job location events are readable by admins or assigned technicians"
  on public.job_location_events;
create policy "job location events are readable by admins or assigned technicians"
on public.job_location_events
for select
to authenticated
using (
  (select private.has_admin_access())
  or (
    (select private.has_active_profile())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_location_events.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

drop policy if exists "technicians read assigned job unit audit items"
  on public.job_unit_audit_items;
create policy "technicians read assigned job unit audit items"
on public.job_unit_audit_items
for select
to authenticated
using (
  (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);

drop policy if exists "technicians insert assigned job unit audit items"
  on public.job_unit_audit_items;
create policy "technicians insert assigned job unit audit items"
on public.job_unit_audit_items
for insert
to authenticated
with check (
  audited_by = (select auth.uid())
  and (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    join public.location_units on location_units.id = job_unit_audit_items.location_unit_id
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
      and jobs.location_id = location_units.location_id
  )
);

drop policy if exists "technicians update assigned job unit audit items"
  on public.job_unit_audit_items;
create policy "technicians update assigned job unit audit items"
on public.job_unit_audit_items
for update
to authenticated
using (
  (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
)
with check (
  audited_by = (select auth.uid())
  and (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    join public.location_units on location_units.id = job_unit_audit_items.location_unit_id
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
      and jobs.location_id = location_units.location_id
  )
);

drop policy if exists "technicians read assigned location units" on public.location_units;
create policy "technicians read assigned location units"
on public.location_units
for select
to authenticated
using (
  (select private.has_active_profile())
  and exists (
    select 1
    from public.jobs
    where jobs.location_id = location_units.location_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
);

-- 3. Reference-data reads. `or status = 'active'` had no role predicate, so any
--    signed-in account -- a customer who found the signup endpoint, an invited
--    account whose profile row was never created -- could list every active
--    chemical (names, EPA numbers, stock levels) and every active form
--    template. Requiring an active profile restores the intended audience:
--    staff.
drop policy if exists "chemical inventory is readable by admins or technicians"
  on public.chemical_inventory;
create policy "chemical inventory is readable by admins or technicians"
on public.chemical_inventory
for select
to authenticated
using (
  (select private.has_admin_access())
  or (status = 'active' and (select private.has_active_profile()))
);

drop policy if exists "form templates are readable by admins or technicians"
  on public.form_templates;
create policy "form templates are readable by admins or technicians"
on public.form_templates
for select
to authenticated
using (
  (select private.has_admin_access())
  or (status = 'active' and (select private.has_active_profile()))
);

-- 4. public.match_compliance_chunks was granted to authenticated and
--    service_role, but the default PUBLIC execute privilege every function is
--    created with was never revoked, so `anon` could call it. The function is
--    `security invoker` and RLS on compliance_chunks yields no rows to anon, so
--    this leaked no data -- but it let an unauthenticated caller run an
--    unbounded pgvector scan, which is billable work. The 2026-09-06 audit
--    recorded this as ruled out; that was wrong.
revoke execute on function public.match_compliance_chunks(
  extensions.vector,
  integer,
  text,
  text
) from public;
revoke execute on function public.match_compliance_chunks(
  extensions.vector,
  integer,
  text,
  text
) from anon;

-- 5. The technician RPCs run as SECURITY DEFINER, so RLS never sees them and
--    the policies above do not cover them. Both bodies are re-stated here with
--    an active-profile guard, plus two fixes to the writes they allow.
--
--    Every pre-existing message is byte-identical to the one it replaces and
--    keeps its error code, so a client released before this migration still
--    behaves the same. The one new message carries PP401, which
--    packages/api-client already maps to `unauthorized`.
create or replace function public.update_assigned_job_status(
  p_job_id uuid,
  p_next_status text,
  p_expected_previous_status text
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required'
      using errcode = 'PP401';
  end if;

  if not (select private.has_active_profile()) then
    raise exception 'Technician account is not active'
      using errcode = 'PP401';
  end if;

  if p_next_status not in ('scheduled', 'en_route', 'in_progress', 'completed') then
    raise exception 'Job status is not available to technicians'
      using errcode = 'PP400';
  end if;

  if p_expected_previous_status not in ('scheduled', 'en_route', 'in_progress', 'completed') then
    raise exception 'Previous job status is required'
      using errcode = 'PP400';
  end if;

  -- A completed job is the input to invoicing. Technicians could previously
  -- move it back to any of the other three states, un-completing work that had
  -- already been invoiced. Forward transitions stay unrestricted: a technician
  -- correcting a mis-tap between scheduled, en_route and in_progress is
  -- ordinary use, and admins can still set any status through the jobs table.
  if p_expected_previous_status = 'completed' and p_next_status <> 'completed' then
    raise exception 'Assigned job status transition is not allowed'
      using errcode = 'PP409';
  end if;

  return query
  update public.jobs
  set
    status = p_next_status,
    updated_at = now()
  where jobs.id = p_job_id
    and jobs.assigned_tech_id = (select auth.uid())
    and jobs.status = p_expected_previous_status
    and jobs.status <> 'canceled'
  returning jobs.*;

  if not found then
    raise exception 'Assigned job status transition is not allowed'
      using errcode = 'PP409';
  end if;
end;
$$;

create or replace function public.record_assigned_job_geofence_event(
  p_job_id uuid,
  p_event_type text,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric,
  p_client_event_id uuid,
  p_captured_at timestamptz
)
returns setof public.job_location_events
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_job record;
  v_distance_m numeric;
  v_radius_m numeric := 150;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required'
      using errcode = 'PP401';
  end if;

  if not (select private.has_active_profile()) then
    raise exception 'Technician account is not active'
      using errcode = 'PP401';
  end if;

  if p_event_type not in ('arrival', 'departure') then
    raise exception 'Geofence event type is invalid'
      using errcode = 'PP400';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Geofence coordinates are invalid'
      using errcode = 'PP400';
  end if;

  if p_accuracy_m is not null and p_accuracy_m < 0 then
    raise exception 'Geofence accuracy is invalid'
      using errcode = 'PP400';
  end if;

  if p_captured_at < now() - interval '24 hours'
    or p_captured_at > now() + interval '5 minutes' then
    raise exception 'Geofence capture time is outside the allowed window'
      using errcode = 'PP400';
  end if;

  select
    jobs.id as job_id,
    jobs.assigned_tech_id,
    locations.latitude::numeric as service_latitude,
    locations.longitude::numeric as service_longitude
  into v_job
  from public.jobs
  join public.locations on locations.id = jobs.location_id
  where jobs.id = p_job_id;

  if not found then
    raise exception 'Assigned job was not found'
      using errcode = 'PP404';
  end if;

  if v_job.assigned_tech_id is distinct from (select auth.uid()) then
    raise exception 'Assigned job geofence event is not allowed'
      using errcode = 'PP401';
  end if;

  if v_job.service_latitude is null or v_job.service_longitude is null then
    v_distance_m := null;
  else
    v_distance_m :=
      2 * 6371000 * asin(
        sqrt(
          power(sin(radians((p_latitude - v_job.service_latitude) / 2)), 2)
          + cos(radians(v_job.service_latitude))
          * cos(radians(p_latitude))
          * power(sin(radians((p_longitude - v_job.service_longitude) / 2)), 2)
        )
      );
  end if;

  -- Geofence rows are arrival/departure evidence: where the technician was,
  -- and how far from the service address. The previous `on conflict ... do
  -- update` let a technician resend a client_event_id they had already used
  -- with new coordinates and a new capture time, silently rewriting that
  -- evidence after the fact. Recording is now write-once.
  return query
  insert into public.job_location_events (
    job_id,
    event_type,
    latitude,
    longitude,
    accuracy_m,
    distance_m,
    within_radius,
    recorded_by,
    client_event_id,
    captured_at
  )
  values (
    p_job_id,
    p_event_type,
    p_latitude,
    p_longitude,
    p_accuracy_m,
    v_distance_m,
    case when v_distance_m is null then null else v_distance_m <= v_radius_m end,
    (select auth.uid()),
    p_client_event_id,
    p_captured_at
  )
  on conflict (client_event_id) do nothing
  returning job_location_events.*;

  if found then
    return;
  end if;

  -- The durable offline queue retries on any transport failure, so a replay of
  -- an event this technician already recorded for this job is expected and must
  -- stay idempotent: hand back the stored row unchanged. A client_event_id that
  -- belongs to another technician or another job is a conflict, not a replay.
  return query
  select events.*
  from public.job_location_events events
  where events.client_event_id = p_client_event_id
    and events.job_id = p_job_id
    and events.recorded_by = (select auth.uid());

  if not found then
    raise exception 'Assigned job geofence event is not allowed'
      using errcode = 'PP409';
  end if;
end;
$$;

-- 6. The same gap in the storage layer. These two policies govern the actual
--    bytes in the job-media bucket, and they reach them through the same
--    `jobs.assigned_tech_id = auth.uid()` test, so a deactivated technician
--    could still download every photo and signature on their open jobs and
--    upload new ones. The bucket_id guard and the folder-name check are
--    unchanged.
drop policy if exists "job media objects are readable by admins or assigned technicians"
  on storage.objects;
create policy "job media objects are readable by admins or assigned technicians"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-media'
  and (
    (select private.has_admin_access())
    or (
      (select private.has_active_profile())
      and exists (
        select 1
        from public.jobs
        where jobs.id = ((storage.foldername(objects.name))[1])::uuid
          and jobs.assigned_tech_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "job media objects are insertable by admins or assigned technicians"
  on storage.objects;
create policy "job media objects are insertable by admins or assigned technicians"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-media'
  and (
    (select private.has_admin_access())
    or (
      (select private.has_active_profile())
      and exists (
        select 1
        from public.jobs
        where jobs.id = ((storage.foldername(objects.name))[1])::uuid
          and jobs.assigned_tech_id = (select auth.uid())
      )
    )
  )
);
