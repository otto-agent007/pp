import type {
  ChemicalLogQueuePayload,
  ArrivalNotificationDecision,
  ArrivalNotificationQueuePayload,
  FormSubmissionQueuePayload,
  JobFormData,
  JobGeofenceEventQueuePayload,
  JobGeofenceEventType,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
  JobStatus,
  JobStatusUpdateQueuePayload,
  OfflineQueueItem,
} from "@pest-patrol/types";

import { validateJobGeofenceEventInput } from "./geofencing";
import { validateChemicalLogInput } from "./inventory";
import {
  validateJobPhotoUploadQueuePayload,
  validateJobSignatureCaptureQueuePayload,
} from "./media";

export interface QueueProcessSummary {
  failed: number;
  processed: number;
  retrying: number;
  skipped: number;
  synced: number;
}

export interface QueueProcessResult {
  items: OfflineQueueItem[];
  summary: QueueProcessSummary;
}

function timestamp(value?: string) {
  return value ?? new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

const jobStatuses: JobStatus[] = [
  "scheduled",
  "en_route",
  "in_progress",
  "completed",
  "canceled",
];
const arrivalNotificationDecisions: ArrivalNotificationDecision[] = [
  "delay_5_min",
  "send_now",
  "skip",
];

function normalizeJobStatus(value: unknown) {
  if (typeof value !== "string" || !jobStatuses.includes(value as JobStatus)) {
    throw new Error("Job status is invalid");
  }

  return value as JobStatus;
}

/**
 * A proof payload's recorded file size, when it carries one.
 *
 * Both proof normalizers used to build their object literal without this key,
 * so the size a technician's device measured was dropped on the way to the
 * provider - `packages/api-client` validates and stores it, and never received
 * one from the queue. It matters more now that `reviewPersistedOfflineQueue`
 * runs these normalizers over a queue read back from a device: without it,
 * reading the queue back would quietly delete a field the queue was holding.
 */
function readOptionalFileSize(value: unknown) {
  return typeof value === "number" ? value : null;
}

function normalizeArrivalNotificationDecision(value: unknown) {
  if (
    typeof value !== "string" ||
    !arrivalNotificationDecisions.includes(value as ArrivalNotificationDecision)
  ) {
    throw new Error("Arrival notification decision is invalid");
  }

  return value as ArrivalNotificationDecision;
}

export function normalizeFormSubmissionQueuePayload(
  payload: unknown,
): FormSubmissionQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Form submission payload is required");
  }

  if (!isRecord(payload.form_data)) {
    throw new Error("Form data is required");
  }

  return {
    job_id: requireString(payload.job_id, "Job"),
    template_id: requireString(payload.template_id, "Form template"),
    form_data: payload.form_data as JobFormData,
  };
}

export function normalizeJobStatusUpdateQueuePayload(
  payload: unknown,
): JobStatusUpdateQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Job status payload is required");
  }

  const previousStatus =
    payload.previous_status === undefined
      ? undefined
      : normalizeJobStatus(payload.previous_status);

  return {
    job_id: requireString(payload.job_id, "Job"),
    status: normalizeJobStatus(payload.status),
    ...(previousStatus ? { previous_status: previousStatus } : {}),
  };
}

export function normalizeChemicalLogQueuePayload(
  payload: unknown,
): ChemicalLogQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Chemical log payload is required");
  }

  const amountUsed =
    typeof payload.amount_used === "number"
      ? payload.amount_used
      : Number(payload.amount_used);
  const normalized = validateChemicalLogInput({
    job_id: requireString(payload.job_id, "Job"),
    chemical_id: requireString(payload.chemical_id, "Chemical"),
    amount_used: amountUsed,
    notes: typeof payload.notes === "string" ? payload.notes : null,
  });

  return {
    job_id: normalized.job_id,
    chemical_id: normalized.chemical_id,
    amount_used: normalized.amount_used,
    notes: normalized.notes,
  };
}

export function normalizeJobPhotoUploadQueuePayload(
  payload: unknown,
): JobPhotoUploadQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Photo upload payload is required");
  }

  return validateJobPhotoUploadQueuePayload({
    job_id: requireString(payload.job_id, "Job"),
    local_uri: requireString(payload.local_uri, "Photo"),
    file_name: requireString(payload.file_name, "Photo file name"),
    content_type: requireString(payload.content_type, "Photo content type"),
    storage_bucket: requireString(payload.storage_bucket, "Storage bucket"),
    storage_path: requireString(payload.storage_path, "Storage path"),
    description:
      typeof payload.description === "string" ? payload.description : null,
    captured_at:
      typeof payload.captured_at === "string" ? payload.captured_at : null,
    file_size_bytes: readOptionalFileSize(payload.file_size_bytes),
  });
}

export function normalizeJobSignatureCaptureQueuePayload(
  payload: unknown,
): JobSignatureCaptureQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Signature capture payload is required");
  }

  return validateJobSignatureCaptureQueuePayload({
    job_id: requireString(payload.job_id, "Job"),
    local_uri: requireString(payload.local_uri, "Signature"),
    file_name: requireString(payload.file_name, "Signature file name"),
    content_type: requireString(payload.content_type, "Signature content type"),
    storage_bucket: requireString(payload.storage_bucket, "Storage bucket"),
    storage_path: requireString(payload.storage_path, "Storage path"),
    signer_name:
      typeof payload.signer_name === "string" ? payload.signer_name : null,
    captured_at:
      typeof payload.captured_at === "string" ? payload.captured_at : null,
    file_size_bytes: readOptionalFileSize(payload.file_size_bytes),
  });
}

export function normalizeJobGeofenceEventQueuePayload(
  payload: unknown,
): JobGeofenceEventQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Geofence event payload is required");
  }

  const normalized = validateJobGeofenceEventInput({
    job_id: requireString(payload.job_id, "Job"),
    event_type: requireString(
      payload.event_type,
      "Geofence event type",
    ) as JobGeofenceEventType,
    latitude:
      typeof payload.latitude === "number"
        ? payload.latitude
        : Number(payload.latitude),
    longitude:
      typeof payload.longitude === "number"
        ? payload.longitude
        : Number(payload.longitude),
    accuracy_m:
      payload.accuracy_m === null || payload.accuracy_m === undefined
        ? null
        : Number(payload.accuracy_m),
    distance_m:
      payload.distance_m === null || payload.distance_m === undefined
        ? null
        : Number(payload.distance_m),
    within_radius:
      typeof payload.within_radius === "boolean" ? payload.within_radius : null,
    client_event_id: requireString(payload.client_event_id, "Client event id"),
    captured_at: requireString(payload.captured_at, "Captured at"),
  });

  return {
    ...normalized,
    accuracy_m: normalized.accuracy_m ?? null,
    distance_m: normalized.distance_m ?? null,
    within_radius: normalized.within_radius ?? null,
  };
}

export function normalizeArrivalNotificationQueuePayload(
  payload: unknown,
): ArrivalNotificationQueuePayload {
  if (!isRecord(payload)) {
    throw new Error("Arrival notification payload is required");
  }

  return {
    job_id: requireString(payload.job_id, "Job"),
    client_event_id: requireString(payload.client_event_id, "Client event id"),
    decision: normalizeArrivalNotificationDecision(payload.decision),
    captured_at: requireString(payload.captured_at, "Captured at"),
  };
}

export function isReadyFormSubmissionQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "form_submission_create") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyFormSubmissionQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyFormSubmissionQueueItem(item, now));
}

export function isReadyJobStatusUpdateQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "job_status_update") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyJobStatusUpdateQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyJobStatusUpdateQueueItem(item, now));
}

export function isReadyChemicalLogQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "chemical_log_create") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyChemicalLogQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyChemicalLogQueueItem(item, now));
}

export function isReadyPhotoUploadQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "photo_upload") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyPhotoUploadQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyPhotoUploadQueueItem(item, now));
}

export function isReadySignatureCaptureQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "signature_capture") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadySignatureCaptureQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadySignatureCaptureQueueItem(item, now));
}

export function isReadyGeofenceEventQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "geofence_event_create") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyGeofenceEventQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyGeofenceEventQueueItem(item, now));
}

export function isReadyArrivalNotificationQueueItem(
  item: OfflineQueueItem,
  now = timestamp(),
) {
  if (item.action !== "arrival_notification_create") {
    return false;
  }

  if (item.status !== "queued" && item.status !== "retrying") {
    return false;
  }

  return !item.next_retry_at || item.next_retry_at <= now;
}

export function hasReadyArrivalNotificationQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some((item) => isReadyArrivalNotificationQueueItem(item, now));
}

export function hasReadyOfflineQueueItems(
  items: OfflineQueueItem[],
  now = timestamp(),
) {
  return items.some(
    (item) =>
      isReadyFormSubmissionQueueItem(item, now) ||
      isReadyJobStatusUpdateQueueItem(item, now) ||
      isReadyChemicalLogQueueItem(item, now) ||
      isReadyPhotoUploadQueueItem(item, now) ||
      isReadySignatureCaptureQueueItem(item, now) ||
      isReadyGeofenceEventQueueItem(item, now) ||
      isReadyArrivalNotificationQueueItem(item, now),
  );
}
