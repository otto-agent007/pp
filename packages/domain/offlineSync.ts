import {
  createGeneratedNotificationEventRecord,
  createJobGeofenceEventRecord,
  createChemicalLogRecord,
  createJobFormSubmissionRecord,
  uploadJobPhotoRecord,
  uploadJobSignatureRecord,
  updateAssignedTechnicianJobStatusRecord,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
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
  NotificationEventInput,
} from "@pest-patrol/types";

import { validateJobGeofenceEventInput } from "./geofencing";
import { validateChemicalLogInput } from "./inventory";
import {
  validateJobPhotoUploadQueuePayload,
  validateJobSignatureCaptureQueuePayload,
} from "./media";
import {
  buildArrivalNotificationGeneratedKey,
  getCustomerSafeNotificationTemplate,
} from "./automation";
import {
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
} from "./offlineQueue";

interface QueueProcessOptions {
  client: AuthSupabaseClient;
  maxAttempts?: number;
  now?: string;
  retryDelayMs?: number;
}

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sync queue item";
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

export async function processFormSubmissionQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyFormSubmissionQueueItem(item, now)) {
    return item;
  }

  let payload: FormSubmissionQueuePayload;

  try {
    payload = normalizeFormSubmissionQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await createJobFormSubmissionRecord(payload, options.client);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processJobStatusUpdateQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyJobStatusUpdateQueueItem(item, now)) {
    return item;
  }

  let payload: JobStatusUpdateQueuePayload;

  try {
    payload = normalizeJobStatusUpdateQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await updateAssignedTechnicianJobStatusRecord(
      options.client,
      payload.job_id,
      payload.status,
      payload.previous_status,
    );
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processChemicalLogQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyChemicalLogQueueItem(item, now)) {
    return item;
  }

  let payload: ChemicalLogQueuePayload;

  try {
    payload = normalizeChemicalLogQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await createChemicalLogRecord(payload, options.client);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processPhotoUploadQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyPhotoUploadQueueItem(item, now)) {
    return item;
  }

  let payload: JobPhotoUploadQueuePayload;

  try {
    payload = normalizeJobPhotoUploadQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await uploadJobPhotoRecord(payload, options.client);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processSignatureCaptureQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadySignatureCaptureQueueItem(item, now)) {
    return item;
  }

  let payload: JobSignatureCaptureQueuePayload;

  try {
    payload = normalizeJobSignatureCaptureQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await uploadJobSignatureRecord(payload, options.client);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processGeofenceEventQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyGeofenceEventQueueItem(item, now)) {
    return item;
  }

  let payload: JobGeofenceEventQueuePayload;

  try {
    payload = normalizeJobGeofenceEventQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await createJobGeofenceEventRecord(payload, options.client);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

function buildArrivalNotificationInput(
  payload: ArrivalNotificationQueuePayload,
): NotificationEventInput {
  const capturedAt = new Date(payload.captured_at);

  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("Captured at must be valid");
  }

  const dueAt = new Date(capturedAt);

  if (payload.decision === "delay_5_min") {
    dueAt.setUTCMinutes(dueAt.getUTCMinutes() + 5);
  }

  const isSkipped = payload.decision === "skip";
  const template = getCustomerSafeNotificationTemplate(
    payload.decision === "delay_5_min"
      ? "arrival_delayed"
      : "arrival_send_now",
  );

  return {
    customer_id: null,
    due_at: dueAt.toISOString(),
    generated_key: buildArrivalNotificationGeneratedKey({
      clientEventId: payload.client_event_id,
      decision: payload.decision,
      jobId: payload.job_id,
    }),
    handled_at: isSkipped ? payload.captured_at : null,
    job_id: payload.job_id,
    message: isSkipped ? null : template.message,
    rule_id: null,
    status: isSkipped ? "dismissed" : "pending",
    title: isSkipped ? "Arrival notice skipped" : template.title,
    type: "arrival_notification",
  };
}

export async function processArrivalNotificationQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);
  const maxAttempts = options.maxAttempts ?? 3;

  if (!isReadyArrivalNotificationQueueItem(item, now)) {
    return item;
  }

  let payload: ArrivalNotificationQueuePayload;

  try {
    payload = normalizeArrivalNotificationQueuePayload(item.payload);
  } catch (error) {
    return markQueueItemFailed(item, errorMessage(error), { now });
  }

  try {
    await createGeneratedNotificationEventRecord(
      buildArrivalNotificationInput(payload),
      options.client,
    );
    return markQueueItemSynced(item, { now });
  } catch (error) {
    const attempts = item.attempts + 1;

    if (attempts >= maxAttempts) {
      return markQueueItemFailed(
        {
          ...item,
          attempts,
        },
        errorMessage(error),
        { now },
      );
    }

    return markQueueItemRetrying(item, errorMessage(error), {
      now,
      retryDelayMs: options.retryDelayMs,
    });
  }
}

export async function processOfflineQueueItem(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  if (item.action === "form_submission_create") {
    return processFormSubmissionQueueItem(item, options);
  }

  if (item.action === "job_status_update") {
    return processJobStatusUpdateQueueItem(item, options);
  }

  if (item.action === "chemical_log_create") {
    return processChemicalLogQueueItem(item, options);
  }

  if (item.action === "photo_upload") {
    return processPhotoUploadQueueItem(item, options);
  }

  if (item.action === "signature_capture") {
    return processSignatureCaptureQueueItem(item, options);
  }

  if (item.action === "geofence_event_create") {
    return processGeofenceEventQueueItem(item, options);
  }

  if (item.action === "arrival_notification_create") {
    return processArrivalNotificationQueueItem(item, options);
  }

  return item;
}

export async function processOfflineQueueItems(
  items: OfflineQueueItem[],
  options: QueueProcessOptions,
): Promise<QueueProcessResult> {
  const summary: QueueProcessSummary = {
    failed: 0,
    processed: 0,
    retrying: 0,
    skipped: 0,
    synced: 0,
  };
  const nextItems: OfflineQueueItem[] = [];

  for (const item of items) {
    const nextItem = await processOfflineQueueItem(item, options);

    if (nextItem === item) {
      summary.skipped += 1;
    } else {
      summary.processed += 1;

      if (nextItem.status === "synced") {
        summary.synced += 1;
      } else if (nextItem.status === "retrying") {
        summary.retrying += 1;
      } else if (nextItem.status === "failed") {
        summary.failed += 1;
      }
    }

    nextItems.push(nextItem);
  }

  return {
    items: nextItems,
    summary,
  };
}

export async function processFormSubmissionQueueItems(
  items: OfflineQueueItem[],
  options: QueueProcessOptions,
) {
  return processOfflineQueueItems(items, options);
}
