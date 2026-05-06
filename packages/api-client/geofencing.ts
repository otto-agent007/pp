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

async function getCurrentUserId(client: GeofencingClient) {
  if (!("auth" in client)) {
    return null;
  }

  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

function toGeofenceEventRow(
  input: JobGeofenceEventInput,
  recordedBy: string | null,
) {
  return {
    job_id: input.job_id,
    event_type: input.event_type,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy_m: input.accuracy_m ?? null,
    distance_m: input.distance_m ?? null,
    within_radius: input.within_radius ?? null,
    recorded_by: recordedBy,
    client_event_id: input.client_event_id,
    captured_at: input.captured_at,
  };
}

export async function createJobGeofenceEventRecord(
  input: JobGeofenceEventInput,
  client: GeofencingClient = supabase,
) {
  const recordedBy = await getCurrentUserId(client);
  const { data, error } = await client
    .from("job_location_events")
    .upsert(toGeofenceEventRow(input, recordedBy), {
      onConflict: "client_event_id",
    })
    .select(geofenceEventSelect)
    .single<JobGeofenceEventRow>();

  if (error) {
    throw error;
  }

  return data as JobGeofenceEvent;
}
