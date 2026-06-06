import type {
  OfflineQueueAction,
  OfflineQueueInput,
  OfflineQueueItem,
  OfflineQueueStatus,
} from "@pest-patrol/types";

interface QueueItemOptions {
  id?: string;
  now?: string;
}

interface RetryOptions {
  now?: string;
  retryDelayMs?: number;
}

export interface OfflineQueueSummary {
  failed: number;
  nextRetryAt: string | null;
  pending: number;
  queued: number;
  retrying: number;
  synced: number;
  total: number;
}

export type OfflineQueueJobTriageState =
  | "failed"
  | "idle"
  | "queued"
  | "retrying"
  | "synced";

export interface OfflineQueueJobTriage {
  failed: number;
  jobId: string;
  label: string;
  pending: number;
  queued: number;
  retrying: number;
  state: OfflineQueueJobTriageState;
  synced: number;
  total: number;
}

const pendingStatuses = new Set<OfflineQueueStatus>(["queued", "retrying", "failed"]);

function timestamp(value?: string) {
  return value ?? new Date().toISOString();
}

export function validateOfflineQueueInput<TPayload>(
  input: OfflineQueueInput<TPayload>,
) {
  if (!input.action) {
    throw new Error("Queue action is required");
  }

  if (input.payload === undefined || input.payload === null) {
    throw new Error("Queue payload is required");
  }

  return input;
}

export function createOfflineQueueItem<TPayload>(
  input: OfflineQueueInput<TPayload>,
  options: QueueItemOptions = {},
): OfflineQueueItem<TPayload> {
  validateOfflineQueueInput(input);

  if (!options.id?.trim()) {
    throw new Error("Queue id is required");
  }

  const now = timestamp(options.now);

  return {
    id: options.id.trim(),
    action: input.action,
    payload: input.payload,
    status: "queued",
    attempts: 0,
    created_at: now,
    updated_at: now,
    next_retry_at: null,
    last_error: null,
  };
}

export function markQueueItemRetrying<TPayload>(
  item: OfflineQueueItem<TPayload>,
  error: string,
  options: RetryOptions = {},
): OfflineQueueItem<TPayload> {
  const now = timestamp(options.now);
  const retryDelayMs = options.retryDelayMs ?? 60_000;
  const nextRetryAt = new Date(new Date(now).getTime() + retryDelayMs).toISOString();

  return {
    ...item,
    attempts: item.attempts + 1,
    last_error: error.trim() || "Sync failed",
    next_retry_at: nextRetryAt,
    status: "retrying",
    updated_at: now,
  };
}

export function markQueueItemFailed<TPayload>(
  item: OfflineQueueItem<TPayload>,
  error: string,
  options: QueueItemOptions = {},
): OfflineQueueItem<TPayload> {
  const now = timestamp(options.now);

  return {
    ...item,
    last_error: error.trim() || "Sync failed",
    next_retry_at: null,
    status: "failed",
    updated_at: now,
  };
}

export function markQueueItemSynced<TPayload>(
  item: OfflineQueueItem<TPayload>,
  options: QueueItemOptions = {},
): OfflineQueueItem<TPayload> {
  const now = timestamp(options.now);

  return {
    ...item,
    last_error: null,
    next_retry_at: null,
    status: "synced",
    updated_at: now,
  };
}

export function clearSyncedQueueItems<TPayload>(
  items: OfflineQueueItem<TPayload>[],
) {
  return items.filter((item) => item.status !== "synced");
}

export function getOfflineQueueSummary<TPayload>(
  items: OfflineQueueItem<TPayload>[],
): OfflineQueueSummary {
  const initialSummary: OfflineQueueSummary = {
    failed: 0,
    nextRetryAt: null,
    pending: 0,
    queued: 0,
    retrying: 0,
    synced: 0,
    total: items.length,
  };

  const summary = items.reduce(
    (accumulator, item) => {
      accumulator[item.status] += 1;

      if (pendingStatuses.has(item.status)) {
        accumulator.pending += 1;
      }

      if (
        item.next_retry_at &&
        (!accumulator.nextRetryAt || item.next_retry_at < accumulator.nextRetryAt)
      ) {
        accumulator.nextRetryAt = item.next_retry_at;
      }

      return accumulator;
    },
    initialSummary,
  );

  return summary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function queueItemJobId<TPayload>(item: OfflineQueueItem<TPayload>) {
  return isRecord(item.payload) && typeof item.payload.job_id === "string"
    ? item.payload.job_id
    : null;
}

function itemNoun(count: number) {
  return count === 1 ? "item" : "items";
}

function payloadJobLabel(payload: unknown) {
  if (!isRecord(payload) || typeof payload.job_id !== "string") {
    return "unknown job";
  }

  return `job ${payload.job_id}`;
}

function geofenceEventLabel(payload: unknown) {
  if (!isRecord(payload) || typeof payload.event_type !== "string") {
    return "Geofence";
  }

  return payload.event_type === "departure" ? "Departure geofence" : "Arrival geofence";
}

function arrivalNotificationLabel(payload: unknown) {
  if (!isRecord(payload) || typeof payload.decision !== "string") {
    return "Arrival notice";
  }

  if (payload.decision === "skip") {
    return "Arrival notice skipped";
  }

  if (payload.decision === "delay_5_min") {
    return "Arrival notice delayed 5 min";
  }

  return "Arrival notice";
}

const queueActionLabels: Record<
  Exclude<OfflineQueueAction, "geofence_event_create" | "arrival_notification_create">,
  string
> = {
  chemical_log_create: "Chemical log",
  form_submission_create: "Treatment form",
  job_status_update: "Status update",
  photo_upload: "Photo capture",
  signature_capture: "Signature",
};

export function getOfflineQueueItemLabel<TPayload>(
  item: OfflineQueueItem<TPayload>,
) {
  const actionLabel =
    item.action === "geofence_event_create"
      ? geofenceEventLabel(item.payload)
      : item.action === "arrival_notification_create"
        ? arrivalNotificationLabel(item.payload)
      : queueActionLabels[item.action];

  return `${actionLabel} for ${payloadJobLabel(item.payload)}`;
}

export function getOfflineQueueJobTriage<TPayload>(
  items: OfflineQueueItem<TPayload>[],
  jobId: string,
): OfflineQueueJobTriage {
  const jobItems = items.filter((item) => queueItemJobId(item) === jobId);
  const summary = getOfflineQueueSummary(jobItems);

  if (summary.failed > 0) {
    return {
      failed: summary.failed,
      jobId,
      label: `${summary.failed} failed sync ${itemNoun(summary.failed)}`,
      pending: summary.pending,
      queued: summary.queued,
      retrying: summary.retrying,
      state: "failed",
      synced: summary.synced,
      total: summary.total,
    };
  }

  if (summary.retrying > 0) {
    return {
      failed: summary.failed,
      jobId,
      label: `${summary.pending} pending sync, ${summary.synced} synced`,
      pending: summary.pending,
      queued: summary.queued,
      retrying: summary.retrying,
      state: "retrying",
      synced: summary.synced,
      total: summary.total,
    };
  }

  if (summary.queued > 0) {
    return {
      failed: summary.failed,
      jobId,
      label: `${summary.queued} queued sync ${itemNoun(summary.queued)}`,
      pending: summary.pending,
      queued: summary.queued,
      retrying: summary.retrying,
      state: "queued",
      synced: summary.synced,
      total: summary.total,
    };
  }

  if (summary.synced > 0) {
    return {
      failed: summary.failed,
      jobId,
      label: `${summary.synced} synced ${itemNoun(summary.synced)}`,
      pending: summary.pending,
      queued: summary.queued,
      retrying: summary.retrying,
      state: "synced",
      synced: summary.synced,
      total: summary.total,
    };
  }

  return {
    failed: 0,
    jobId,
    label: "No local sync work",
    pending: 0,
    queued: 0,
    retrying: 0,
    state: "idle",
    synced: 0,
    total: 0,
  };
}
