-- Technician RPC error codes.
--
-- Both functions enforced their preconditions with a bare `raise exception`,
-- which reaches the client as SQLSTATE P0001 carrying only message text. So the
-- distinction that matters most to the durable offline queue -- a transition
-- another device already made, versus an intent that was never valid -- was
-- recoverable only by matching English prose, and two genuinely different
-- geofence failures were indistinguishable because they share one message.
--
-- Each raise now carries an application error code. The codes map one to one
-- onto the MutationFailureReason values in packages/types:
--
--   PP400  invalid-intent         no retry can make this request valid
--   PP401  unauthorized           the caller may not perform this write
--   PP404  target-missing         the target of the write does not exist
--   PP409  precondition-conflict  current state disagrees with the intent
--
-- Class PP is unused by PostgreSQL, whose PL/pgSQL codes live in class P0, and
-- is not one of the PT codes PostgREST interprets as an HTTP status, so these
-- travel to the client in the error's `code` field without being reinterpreted.
--
-- Every message is byte-identical to the one it replaces. A client released
-- before this migration still matches on the text, so an older app against a
-- migrated database keeps working.

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

  if p_next_status not in ('scheduled', 'en_route', 'in_progress', 'completed') then
    raise exception 'Job status is not available to technicians'
      using errcode = 'PP400';
  end if;

  if p_expected_previous_status not in ('scheduled', 'en_route', 'in_progress', 'completed') then
    raise exception 'Previous job status is required'
      using errcode = 'PP400';
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
  on conflict (client_event_id) do update
  set
    event_type = excluded.event_type,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    distance_m = excluded.distance_m,
    within_radius = excluded.within_radius,
    captured_at = excluded.captured_at
  where job_location_events.job_id = p_job_id
    and job_location_events.recorded_by = (select auth.uid())
  returning job_location_events.*;

  if not found then
    raise exception 'Assigned job geofence event is not allowed'
      using errcode = 'PP409';
  end if;
end;
$$;
