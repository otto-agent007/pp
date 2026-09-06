-- Technicians must record arrival/departure events only through the
-- geofence-validating RPC (public.record_assigned_job_geofence_event), which
-- computes distance-to-site server-side. The direct-insert policy below let a
-- technician bypass that validation entirely by self-reporting
-- latitude/longitude/within_radius via a plain INSERT. App code never
-- inserts into job_location_events directly (see
-- packages/api-client/geofencing.ts), so the direct-insert path is dropped.
drop policy if exists "job location events are insertable by admins or assigned technicians"
  on public.job_location_events;
create policy "job location events are insertable by admins"
on public.job_location_events
for insert
to authenticated
with check ((select private.has_admin_access()));

-- job_media rows must reference storage objects inside the job's own
-- folder. Storage-layer RLS on storage.objects already enforces this via
-- (storage.foldername(objects.name))[1] = job_id, but the job_media table
-- policy only checked job_id/uploaded_by, letting a technician insert a
-- metadata row pointing at an arbitrary storage_path string.
drop policy if exists "job media is insertable by admins or assigned technicians"
  on public.job_media;
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
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_media.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);

-- Portal sessions are only ever read/written by API routes using the
-- service-role client (createServiceRoleSupabaseClient), which bypasses RLS.
-- The authenticated-role policy below let any dispatcher directly
-- UPDATE/DELETE session rows via PostgREST, bypassing the app's
-- audit-logging and undermining the revocation guarantees in the portal
-- session flow (revoke/route.ts, sessions/route.ts).
drop policy if exists "admins manage portal sessions"
  on public.customer_portal_sessions;

-- job-media bucket had no mime-type or size limits. App-level validation
-- (packages/domain/media.ts) already caps photos at 10MB and signatures at
-- 2MB, and only accepts image/jpeg, image/png, image/webp — mirror those
-- limits at the storage layer as defense in depth.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'job-media';

-- job_unit_audit_items let a technician record an audit item against any
-- location_unit_id as long as the job_id was assigned to them, without
-- checking that the unit actually belongs to that job's location.
drop policy if exists "technicians insert assigned job unit audit items"
  on public.job_unit_audit_items;
create policy "technicians insert assigned job unit audit items"
on public.job_unit_audit_items
for insert
to authenticated
with check (
  audited_by = (select auth.uid())
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
  exists (
    select 1
    from public.jobs
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
  )
)
with check (
  audited_by = (select auth.uid())
  and exists (
    select 1
    from public.jobs
    join public.location_units on location_units.id = job_unit_audit_items.location_unit_id
    where jobs.id = job_unit_audit_items.job_id
      and jobs.assigned_tech_id = (select auth.uid())
      and jobs.location_id = location_units.location_id
  )
);
