import type { OfflineSyncPort } from "@pest-patrol/application";
import type {
  QueueProcessResult,
  QueueProcessSummary,
} from "@pest-patrol/domain";
import type {
  ArrivalNotificationQueuePayload,
  ChemicalLogQueuePayload,
  FormSubmissionQueuePayload,
  JobGeofenceEventQueuePayload,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
  JobStatusUpdateQueuePayload,
  NotificationEventInput,
  OfflineQueueItem,
} from "@pest-patrol/types";
import {
  buildArrivalNotificationGeneratedKey,
  getCustomerSafeNotificationTemplate,
  isReadyArrivalNotificationQueueItem,
  isReadyChemicalLogQueueItem,
  isReadyFormSubmissionQueueItem,
  isReadyGeofenceEventQueueItem,
  isReadyJobStatusUpdateQueueItem,
  isReadyPhotoUploadQueueItem,
  isReadySignatureCaptureQueueItem,
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
  normalizeArrivalNotificationQueuePayload,
  normalizeChemicalLogQueuePayload,
  normalizeFormSubmissionQueuePayload,
  normalizeJobGeofenceEventQueuePayload,
  normalizeJobPhotoUploadQueuePayload,
  normalizeJobSignatureCaptureQueuePayload,
  normalizeJobStatusUpdateQueuePayload,
  timestamp,
} from "@pest-patrol/domain";

interface QueueProcessOptions {
  maxAttempts?: number;
  now?: string;
  retryDelayMs?: number;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sync queue item";
}

export async function processFormSubmissionQueueItem(
  port: OfflineSyncPort,
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
    await port.createJobFormSubmissionRecord(payload);
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
  port: OfflineSyncPort,
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
    await port.updateAssignedTechnicianJobStatusRecord(
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
  port: OfflineSyncPort,
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
    await port.createChemicalLogRecord(payload);
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
  port: OfflineSyncPort,
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
    await port.uploadJobPhotoRecord(payload);
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
  port: OfflineSyncPort,
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
    await port.uploadJobSignatureRecord(payload);
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
  port: OfflineSyncPort,
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
    await port.createJobGeofenceEventRecord(payload);
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
    payload.decision === "delay_5_min" ? "arrival_delayed" : "arrival_send_now",
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
  port: OfflineSyncPort,
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
    await port.createGeneratedNotificationEventRecord(
      buildArrivalNotificationInput(payload),
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
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  if (item.action === "form_submission_create") {
    return processFormSubmissionQueueItem(port, item, options);
  }

  if (item.action === "job_status_update") {
    return processJobStatusUpdateQueueItem(port, item, options);
  }

  if (item.action === "chemical_log_create") {
    return processChemicalLogQueueItem(port, item, options);
  }

  if (item.action === "photo_upload") {
    return processPhotoUploadQueueItem(port, item, options);
  }

  if (item.action === "signature_capture") {
    return processSignatureCaptureQueueItem(port, item, options);
  }

  if (item.action === "geofence_event_create") {
    return processGeofenceEventQueueItem(port, item, options);
  }

  if (item.action === "arrival_notification_create") {
    return processArrivalNotificationQueueItem(port, item, options);
  }

  return item;
}

export async function processOfflineQueueItems(
  port: OfflineSyncPort,
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
    const nextItem = await processOfflineQueueItem(port, item, options);

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
  port: OfflineSyncPort,
  items: OfflineQueueItem[],
  options: QueueProcessOptions,
) {
  return processOfflineQueueItems(port, items, options);
}
