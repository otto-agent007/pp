-- Security hardening follow-up for technician RPC execution privileges.
-- The technician RPCs are intentionally callable by authenticated technicians only.
-- Anonymous/public callers must be denied even though function bodies already enforce auth and ownership checks,
-- because SECURITY DEFINER execution should not be exposed to unauthenticated contexts.

revoke execute on function public.update_assigned_job_status(uuid, text, text) from anon;
revoke execute on function public.update_assigned_job_status(uuid, text, text) from public;
grant execute on function public.update_assigned_job_status(uuid, text, text) to authenticated;

-- Keep authenticated execute for assigned technician mobile flow (status + geofence),
-- where client code requires RPC permission to record technician-owned job updates.
revoke execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) from anon;
revoke execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) from public;
grant execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) to authenticated;
