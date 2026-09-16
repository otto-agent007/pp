-- Location-event author boundary (2026-09-10 security review follow-up).
--
-- A technician's arrival and departure coordinates are personal location
-- history: where a named person physically was, and when. The read policy
-- scoped that history to the job's *current* assignee, so reassigning a job
-- handed the incoming technician every latitude, longitude and timestamp the
-- outgoing one had recorded against it. Reassignment is routine -- a callback,
-- a sick day, a route rebalance -- so this was not an edge case.
--
-- Admins keep the whole trail: it is arrival evidence and the audit is theirs.
-- A technician now reads only the events they recorded themselves, and only
-- while still assigned to the job.
--
-- Nothing legitimate is lost. jobs.assigned_tech_id holds a single technician,
-- so there is no crew that shares a trail. The only technician write path is
-- public.record_assigned_job_geofence_event, which is SECURITY DEFINER and
-- stamps recorded_by = auth.uid() itself, so a technician's own rows always
-- carry their id. Every surface that lists the full trail -- the command
-- center, dispatch and closeouts -- is admin-only.
--
-- recorded_by is nullable (on delete set null), so events whose author has been
-- deleted stay visible to admins and disappear from the technician branch,
-- which is the right way round.

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
    and job_location_events.recorded_by = (select auth.uid())
    and exists (
      select 1
      from public.jobs
      where jobs.id = job_location_events.job_id
        and jobs.assigned_tech_id = (select auth.uid())
    )
  )
);
