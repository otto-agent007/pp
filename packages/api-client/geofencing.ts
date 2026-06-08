import type {
  JobGeofenceEvent,
  JobGeofenceEventInput,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type GeofencingClient = typeof supabase | AuthSupabaseClient;
type JobGeofenceEventRow = JobGeofenceEvent;

const geofenceEventSelect =
  "*, job:jobs(*, customer:customers(*), location:locations(*))";

export async function createJobGeofenceEventRecord(
  input: JobGeofenceEventInput,
  client: GeofencingClient = supabase,
) {
  const { data, error } = await client
    .rpc("record_assigned_job_geofence_event", {
      p_accuracy_m: input.accuracy_m ?? null,
      p_captured_at: input.captured_at,
      p_client_event_id: input.client_event_id,
      p_event_type: input.event_type,
      p_job_id: input.job_id,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
    })
    .select(geofenceEventSelect)
    .single<JobGeofenceEventRow>();

  if (error) {
    throw error;
  }

  return data as JobGeofenceEvent;
}

export async function listJobGeofenceEventRecords(
  client: GeofencingClient = supabase,
) {
  const { data, error } = await client
    .from("job_location_events")
    .select(geofenceEventSelect)
    .order("captured_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as JobGeofenceEvent[];
}
