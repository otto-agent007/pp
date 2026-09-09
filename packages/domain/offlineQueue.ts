import type {
  MutationOutcomeKind,
  OfflineQueueAction,
  OfflineQueueInput,
  OfflineQueueItem,
  OfflineQueuePayloadByAction,
  OfflineQueueStatus,
} from "@pest-patrol/types";

interface QueueItemOptions {
  id?: string;
  now?: string;
}

interface RetryOptions {
  now?: string;
  retryDelayMs?: number;
  /**
   * How the attempt resolved, as `packages/application` decided it.
   *
   * The queue records the outcome; it does not classify one. Defaulting keeps
   * every existing caller correct: a retry that reaches here without an outcome
   * is by construction a retryable one.
   */
  outcome?: MutationOutcomeKind;
}

interface FailureOptions {
  now?: string;
  /**
   * How the attempt resolved. Defaults to `terminal`, since an item marked
   * failed has by construction stopped being retried.
   */
  outcome?: MutationOutcomeKind;
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
const sensitiveProofPayloadKeys = new Set([
  "base64",
  "base64_data",
  "base64Data",
  "data_url",
  "dataUrl",
  "local_uri",
  "localUri",
  "photo_data",
  "photoData",
  "signature_data",
  "signatureData",
  "uri",
]);
const sensitiveProofActions = new Set<OfflineQueueAction>([
  "photo_upload",
  "signature_capture",
]);

export function timestamp(value?: string) {
  return value ?? new Date().toISOString();
}

export function validateOfflineQueueInput<TAction extends OfflineQueueAction>(
  input: OfflineQueueInput<TAction>,
) {
  if (!input.action) {
    throw new Error("Queue action is required");
  }

  if (input.payload === undefined || input.payload === null) {
    throw new Error("Queue payload is required");
  }

  return input;
}

export function createOfflineQueueItem<TAction extends OfflineQueueAction>(
  input: OfflineQueueInput<TAction>,
  options: QueueItemOptions = {},
): OfflineQueueItem<TAction> {
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
    outcome: null,
  };
}

export function markQueueItemRetrying<TAction extends OfflineQueueAction>(
  item: OfflineQueueItem<TAction>,
  error: string,
  options: RetryOptions = {},
): OfflineQueueItem<TAction> {
  const now = timestamp(options.now);
  const retryDelayMs = options.retryDelayMs ?? 60_000;
  const nextRetryAt = new Date(new Date(now).getTime() + retryDelayMs).toISOString();

  return {
    ...item,
    attempts: item.attempts + 1,
    last_error: error.trim() || "Sync failed",
    next_retry_at: nextRetryAt,
    outcome: options.outcome ?? "retryable",
    status: "retrying",
    updated_at: now,
  };
}

export function markQueueItemFailed<TAction extends OfflineQueueAction>(
  item: OfflineQueueItem<TAction>,
  error: string,
  options: FailureOptions = {},
): OfflineQueueItem<TAction> {
  const now = timestamp(options.now);

  return {
    ...item,
    last_error: error.trim() || "Sync failed",
    next_retry_at: null,
    outcome: options.outcome ?? "terminal",
    status: "failed",
    updated_at: now,
  };
}

export function markQueueItemSynced<TAction extends OfflineQueueAction>(
  item: OfflineQueueItem<TAction>,
  options: QueueItemOptions = {},
): OfflineQueueItem<TAction> {
  const now = timestamp(options.now);

  return {
    ...item,
    last_error: null,
    next_retry_at: null,
    outcome: "applied",
    payload: scrubSensitiveSyncedProofPayload(item.action, item.payload),
    status: "synced",
    updated_at: now,
  };
}

export function scrubSensitiveSyncedProofPayload<
  TAction extends OfflineQueueAction,
>(
  action: TAction,
  payload: OfflineQueuePayloadByAction[TAction],
): OfflineQueuePayloadByAction[TAction] {
  if (!sensitiveProofActions.has(action) || !isRecord(payload)) {
    return payload;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !sensitiveProofPayloadKeys.has(key)),
  ) as OfflineQueuePayloadByAction[TAction];
}

export function clearSyncedQueueItems<TAction extends OfflineQueueAction>(
  items: OfflineQueueItem<TAction>[],
) {
  return items.filter((item) => item.status !== "synced");
}

export function getOfflineQueueSummary<TAction extends OfflineQueueAction>(
  items: OfflineQueueItem<TAction>[],
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

function queueItemJobId<TAction extends OfflineQueueAction>(item: OfflineQueueItem<TAction>) {
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

/**
 * Every action's label, either fixed or derived from that action's payload.
 *
 * Total over `OfflineQueueAction` by construction, so a newly added action is a
 * compile error here rather than a silently missing label.
 */
const queueActionLabels: {
  [K in OfflineQueueAction]:
    | string
    | ((payload: OfflineQueuePayloadByAction[K]) => string);
} = {
  arrival_notification_create: arrivalNotificationLabel,
  chemical_log_create: "Chemical log",
  form_submission_create: "Treatment form",
  geofence_event_create: geofenceEventLabel,
  job_status_update: "Status update",
  photo_upload: "Photo capture",
  signature_capture: "Signature",
};

export function getOfflineQueueItemLabel<TAction extends OfflineQueueAction>(
  item: OfflineQueueItem<TAction>,
) {
  const label = queueActionLabels[item.action];
  const actionLabel = typeof label === "string" ? label : label(item.payload);

  return `${actionLabel} for ${payloadJobLabel(item.payload)}`;
}

export function getOfflineQueueJobTriage<TAction extends OfflineQueueAction>(
  items: OfflineQueueItem<TAction>[],
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
