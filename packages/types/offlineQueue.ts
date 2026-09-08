import type { JobFormData } from "./forms";
import type {
  ArrivalNotificationDecision,
  JobGeofenceEventType,
} from "./geofencing";
import type { JobStatus } from "./jobs";

export type OfflineQueueAction =
  | "form_submission_create"
  | "job_status_update"
  | "chemical_log_create"
  | "photo_upload"
  | "signature_capture"
  | "geofence_event_create"
  | "arrival_notification_create";

export type OfflineQueueStatus = "queued" | "retrying" | "failed" | "synced";

export interface JobStatusUpdateQueuePayload extends Record<string, unknown> {
  job_id: string;
  status: JobStatus;
  previous_status?: JobStatus;
}

export interface JobGeofenceEventQueuePayload extends Record<string, unknown> {
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  distance_m: number | null;
  within_radius: boolean | null;
  client_event_id: string;
  captured_at: string;
}

export interface ArrivalNotificationQueuePayload extends Record<string, unknown> {
  captured_at: string;
  client_event_id: string;
  decision: ArrivalNotificationDecision;
  job_id: string;
}

export interface ChemicalLogQueuePayload extends Record<string, unknown> {
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes?: string | null;
}

export interface JobPhotoUploadQueuePayload extends Record<string, unknown> {
  job_id: string;
  local_uri: string;
  file_name: string;
  content_type: string;
  storage_bucket: string;
  storage_path: string;
  description?: string | null;
  captured_at?: string | null;
  file_size_bytes?: number | null;
}

export interface JobSignatureCaptureQueuePayload extends Record<
  string,
  unknown
> {
  job_id: string;
  local_uri: string;
  file_name: string;
  content_type: string;
  storage_bucket: string;
  storage_path: string;
  signer_name?: string | null;
  captured_at?: string | null;
  file_size_bytes?: number | null;
}

export interface FormSubmissionQueuePayload extends Record<string, unknown> {
  job_id: string;
  template_id: string;
  form_data: JobFormData;
}

export interface OfflineQueueInput<TPayload = Record<string, unknown>> {
  action: OfflineQueueAction;
  payload: TPayload;
}

export interface OfflineQueueItem<TPayload = Record<string, unknown>> {
  id: string;
  action: OfflineQueueAction;
  payload: TPayload;
  status: OfflineQueueStatus;
  attempts: number;
  created_at: string;
  updated_at: string;
  next_retry_at: string | null;
  last_error: string | null;
}
