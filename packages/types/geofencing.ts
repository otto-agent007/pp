import type { Job } from "./jobs";

export type JobGeofenceEventType = "arrival" | "departure";

export interface JobGeofenceEvent {
  id: string;
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  distance_m: number | null;
  within_radius: boolean | null;
  recorded_by: string | null;
  client_event_id: string;
  captured_at: string;
  created_at: string;
  job?: Job;
}

export interface JobGeofenceEventInput extends Record<string, unknown> {
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  distance_m?: number | null;
  within_radius?: boolean | null;
  client_event_id: string;
  captured_at: string;
}

export type ArrivalNotificationDecision =
  | "delay_5_min"
  | "send_now"
  | "skip";
