import {
  DEFAULT_MUTATION_OUTCOME_POLICY,
  mutationFailureReason,
  resolveMutationOutcome,
} from "@pest-patrol/application";
import type { OfflineSyncPort } from "@pest-patrol/application";
import type {
  QueueProcessResult,
  QueueProcessSummary,
} from "@pest-patrol/domain";
import type {
  ArrivalNotificationQueuePayload,
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
  /**
   * Attempts allowed before a retryable failure becomes terminal.
   *
   * Defaults to `packages/application`'s policy. This package used to default
   * to three of its own, so the budget was declared in two places that
   * disagreed; `docs/architecture.md` makes `packages/application` the owner of
   * these semantics, so the queue reads the budget rather than setting one.
   */
  maxAttempts?: number;
  now?: string;
  retryDelayMs?: number;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to sync queue item";
}

/**
 * Turn a failed attempt into the item's next state.
 *
 * Every action used to carry its own copy of this, branching on
 * `attempts >= maxAttempts` and treating every thrown value alike. The reason
 * now comes from the adapter, so a conflict and a terminal failure stop the
 * queue immediately rather than spending the remaining budget first, and the
 * resolved outcome is recorded on the item for `apps` to present.
 */
function applyQueueItemFailure(
  item: OfflineQueueItem,
  error: unknown,
  options: QueueProcessOptions,
  now: string,
): OfflineQueueItem {
  const attempts = item.attempts + 1;
  const outcome = resolveMutationOutcome(mutationFailureReason(error), attempts, {
    maxAttempts: options.maxAttempts ?? DEFAULT_MUTATION_OUTCOME_POLICY.maxAttempts,
  });

  if (!outcome.retryable) {
    return markQueueItemFailed({ ...item, attempts }, errorMessage(error), {
      now,
      outcome: outcome.kind,
    });
  }

  return markQueueItemRetrying(item, errorMessage(error), {
    now,
    outcome: outcome.kind,
    retryDelayMs: options.retryDelayMs,
  });
}

/**
 * The shape every action's processing shares: skip unless ready, refuse a
 * payload the domain will not normalize, then send it and record what happened.
 */
async function processQueueItemWith<TPayload>(
  item: OfflineQueueItem,
  options: QueueProcessOptions,
  isReady: (candidate: OfflineQueueItem, now: string) => boolean,
  normalize: (payload: unknown) => TPayload,
  send: (payload: TPayload) => Promise<unknown>,
): Promise<OfflineQueueItem> {
  const now = timestamp(options.now);

  if (!isReady(item, now)) {
    return item;
  }

  let payload: TPayload;

  try {
    payload = normalize(item.payload);
  } catch (error) {
    // A payload the domain refuses is an intent no retry can make valid, so it
    // is terminal by construction rather than by exhausting the budget.
    return markQueueItemFailed(item, errorMessage(error), {
      now,
      outcome: "terminal",
    });
  }

  try {
    await send(payload);
    return markQueueItemSynced(item, { now });
  } catch (error) {
    return applyQueueItemFailure(item, error, options, now);
  }
}

export async function processFormSubmissionQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadyFormSubmissionQueueItem,
    normalizeFormSubmissionQueuePayload,
    (payload) => port.createJobFormSubmissionRecord(payload),
  );
}

export async function processJobStatusUpdateQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadyJobStatusUpdateQueueItem,
    normalizeJobStatusUpdateQueuePayload,
    (payload) =>
      port.updateAssignedTechnicianJobStatusRecord(
        payload.job_id,
        payload.status,
        payload.previous_status,
      ),
  );
}

export async function processChemicalLogQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadyChemicalLogQueueItem,
    normalizeChemicalLogQueuePayload,
    (payload) => port.createChemicalLogRecord(payload),
  );
}

export async function processPhotoUploadQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadyPhotoUploadQueueItem,
    normalizeJobPhotoUploadQueuePayload,
    (payload) => port.uploadJobPhotoRecord(payload),
  );
}

export async function processSignatureCaptureQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadySignatureCaptureQueueItem,
    normalizeJobSignatureCaptureQueuePayload,
    (payload) => port.uploadJobSignatureRecord(payload),
  );
}

export async function processGeofenceEventQueueItem(
  port: OfflineSyncPort,
  item: OfflineQueueItem,
  options: QueueProcessOptions,
): Promise<OfflineQueueItem> {
  return processQueueItemWith(
    item,
    options,
    isReadyGeofenceEventQueueItem,
    normalizeJobGeofenceEventQueuePayload,
    (payload) => port.createJobGeofenceEventRecord(payload),
  );
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
  return processQueueItemWith(
    item,
    options,
    isReadyArrivalNotificationQueueItem,
    normalizeArrivalNotificationQueuePayload,
    (payload) =>
      port.createGeneratedNotificationEventRecord(
        buildArrivalNotificationInput(payload),
      ),
  );
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
