import type {
  MutationOutcomeKind,
  OfflineQueueAction,
  OfflineQueueInput,
  OfflineQueueItem,
  OfflineQueuePayloadByAction,
  OfflineQueueStatus,
} from "@pest-patrol/types";

import {
  normalizeArrivalNotificationQueuePayload,
  normalizeChemicalLogQueuePayload,
  normalizeFormSubmissionQueuePayload,
  normalizeJobGeofenceEventQueuePayload,
  normalizeJobPhotoUploadQueuePayload,
  normalizeJobSignatureCaptureQueuePayload,
  normalizeJobStatusUpdateQueuePayload,
} from "./offlineSync";

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

/**
 * Remove an item the technician has decided to give up on.
 *
 * Only a `failed` item can be discarded. The queue is still working on
 * everything else, so letting a discard reach one would throw away field work
 * that was going to sync on its own. `clearSyncedQueueItems` is the other half:
 * it removes only what has already landed, which left an item that stopped
 * being retried with no way out of the queue at all.
 */
export function discardQueueItem<TAction extends OfflineQueueAction>(
  items: OfflineQueueItem<TAction>[],
  id: string,
) {
  return items.filter((item) => item.id !== id || item.status !== "failed");
}

export function discardRejectedQueueEntry(
  entries: RejectedOfflineQueueEntry[],
  id: string,
) {
  return entries.filter((entry) => entry.id !== id);
}

/**
 * Every action's payload normalizer, keyed by the action it belongs to.
 *
 * This is the action-to-payload mapping CR07 established, made readable at
 * runtime so a persisted entry can be checked against it rather than cast to
 * it. Total over `OfflineQueueAction` by construction, so a newly added action
 * is a compile error here rather than an entry that validates by default.
 */
const queuePayloadNormalizers: {
  [K in OfflineQueueAction]: (payload: unknown) => OfflineQueuePayloadByAction[K];
} = {
  arrival_notification_create: normalizeArrivalNotificationQueuePayload,
  chemical_log_create: normalizeChemicalLogQueuePayload,
  form_submission_create: normalizeFormSubmissionQueuePayload,
  geofence_event_create: normalizeJobGeofenceEventQueuePayload,
  job_status_update: normalizeJobStatusUpdateQueuePayload,
  photo_upload: normalizeJobPhotoUploadQueuePayload,
  signature_capture: normalizeJobSignatureCaptureQueuePayload,
};

/** Total over `OfflineQueueStatus`, so a new status is a compile error here. */
const queueStatuses: Record<OfflineQueueStatus, true> = {
  failed: true,
  queued: true,
  retrying: true,
  synced: true,
};

/** Total over `MutationOutcomeKind`, for the same reason. */
const mutationOutcomeKinds: Record<MutationOutcomeKind, true> = {
  ambiguous: true,
  applied: true,
  conflict: true,
  retryable: true,
  terminal: true,
};

/**
 * A persisted entry the queue kept but cannot vouch for.
 *
 * It carries the `status` and `outcome` a terminal sync failure carries, so the
 * technician meets it through the same recovery interaction. It has no
 * `payload` field, and `entry` holds the record exactly as it was read: typing
 * an unvalidated payload as its action's payload would be the unchecked cast
 * this validation exists to remove, and rewriting it would lose what the
 * technician needs to look at before discarding it.
 */
export interface RejectedOfflineQueueEntry {
  action: OfflineQueueAction | null;
  entry: unknown;
  id: string;
  last_error: string;
  outcome: "terminal";
  status: "failed";
}

export interface PersistedOfflineQueueReview {
  items: OfflineQueueItem[];
  rejected: RejectedOfflineQueueEntry[];
}

type PersistedEntryReview =
  | { kind: "item"; item: OfflineQueueItem }
  | { kind: "rejected"; rejected: RejectedOfflineQueueEntry };

function isOfflineQueueAction(value: unknown): value is OfflineQueueAction {
  return typeof value === "string" && value in queuePayloadNormalizers;
}

function isOfflineQueueStatus(value: unknown): value is OfflineQueueStatus {
  return typeof value === "string" && value in queueStatuses;
}

function isMutationOutcomeKind(value: unknown): value is MutationOutcomeKind {
  return typeof value === "string" && value in mutationOutcomeKinds;
}

function readPersistedId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPersistedTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return Number.isNaN(Date.parse(value)) ? null : value;
}

function readPersistedAttempts(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function rejectionMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";

  return message || "Saved change could not be read";
}

/**
 * Read one persisted entry back into a queue item.
 *
 * The payload is normalized through the action's own normalizer, so a payload
 * the domain would refuse at sync time is refused here instead of reaching the
 * provider. The envelope follows one rule: a field that is absent takes its
 * default, and a field that is present but not a value the queue understands is
 * damage. Absent has to be forgiving because the record grows over time - an
 * item queued before CR19 added `outcome` carries no such key, and treating
 * that as damage would strand field work on the first upgrade after it.
 *
 * A damaged envelope keeps the item and marks it terminal rather than repairing
 * it quietly: the values are readable enough to show the technician and not
 * trustworthy enough to send.
 */
function buildPersistedQueueItem<TAction extends OfflineQueueAction>(
  action: TAction,
  id: string,
  entry: Record<string, unknown>,
  now: string,
): OfflineQueueItem<TAction> {
  const payload = queuePayloadNormalizers[action](entry.payload);
  const damaged: string[] = [];

  const createdAt = readPersistedTimestamp(entry.created_at);

  if (entry.created_at !== undefined && createdAt === null) {
    damaged.push("created_at");
  }

  const updatedAt = readPersistedTimestamp(entry.updated_at);

  if (entry.updated_at !== undefined && updatedAt === null) {
    damaged.push("updated_at");
  }

  const attempts = readPersistedAttempts(entry.attempts);

  if (entry.attempts !== undefined && attempts === null) {
    damaged.push("attempts");
  }

  let status: OfflineQueueStatus = "queued";

  if (entry.status !== undefined) {
    if (isOfflineQueueStatus(entry.status)) {
      status = entry.status;
    } else {
      damaged.push("status");
    }
  }

  let nextRetryAt: string | null = null;

  if (entry.next_retry_at !== undefined && entry.next_retry_at !== null) {
    nextRetryAt = readPersistedTimestamp(entry.next_retry_at);

    if (nextRetryAt === null) {
      damaged.push("next_retry_at");
    }
  }

  let lastError: string | null = null;

  if (entry.last_error !== undefined && entry.last_error !== null) {
    if (typeof entry.last_error === "string") {
      lastError = entry.last_error;
    } else {
      damaged.push("last_error");
    }
  }

  let outcome: MutationOutcomeKind | null = null;

  if (entry.outcome !== undefined && entry.outcome !== null) {
    if (isMutationOutcomeKind(entry.outcome)) {
      outcome = entry.outcome;
    } else {
      damaged.push("outcome");
    }
  }

  const item: OfflineQueueItem<TAction> = {
    id,
    action,
    payload,
    status,
    attempts: attempts ?? 0,
    created_at: createdAt ?? now,
    updated_at: updatedAt ?? now,
    next_retry_at: nextRetryAt,
    last_error: lastError,
    outcome,
  };

  if (damaged.length === 0) {
    return item;
  }

  return markQueueItemFailed(
    item,
    `Saved change was stored with unreadable ${damaged.join(", ")}`,
    { now },
  );
}

function reviewPersistedEntry(
  entry: unknown,
  index: number,
  now: string,
): PersistedEntryReview {
  const fallbackId = `unreadable-${index + 1}`;

  if (!isRecord(entry)) {
    return {
      kind: "rejected",
      rejected: {
        action: null,
        entry,
        id: fallbackId,
        last_error: "Saved change is not a queue record",
        outcome: "terminal",
        status: "failed",
      },
    };
  }

  if (!isOfflineQueueAction(entry.action)) {
    return {
      kind: "rejected",
      rejected: {
        action: null,
        entry,
        id: readPersistedId(entry.id) ?? fallbackId,
        last_error: "Saved change names an action this app does not know",
        outcome: "terminal",
        status: "failed",
      },
    };
  }

  const action = entry.action;
  const id = readPersistedId(entry.id);

  if (!id) {
    return {
      kind: "rejected",
      rejected: {
        action,
        entry,
        id: fallbackId,
        last_error: "Saved change has no queue id",
        outcome: "terminal",
        status: "failed",
      },
    };
  }

  try {
    return { kind: "item", item: buildPersistedQueueItem(action, id, entry, now) };
  } catch (error) {
    return {
      kind: "rejected",
      rejected: {
        action,
        entry,
        id,
        last_error: rejectionMessage(error),
        outcome: "terminal",
        status: "failed",
      },
    };
  }
}

/**
 * Check a persisted offline queue against the action-to-payload mapping.
 *
 * `apps/mobile` used to read this back with `JSON.parse(value) as T`, so
 * whatever the device happened to hold became the queue's state unchecked. CR07
 * established the mapping and left the cast deliberately; this is what reads it.
 *
 * Nothing is dropped. An entry this cannot represent as a queue item is
 * returned as a `RejectedOfflineQueueEntry` carrying the record as it was read,
 * so the caller can show it, persist it back untouched and let the technician
 * discard it - the same three things it does with any other terminal failure.
 * A non-array value is reviewed as a single entry for that reason: it is
 * unreadable, which is not a reason to lose it silently.
 */
export function reviewPersistedOfflineQueue(
  value: unknown,
  options: { now?: string } = {},
): PersistedOfflineQueueReview {
  const now = timestamp(options.now);
  const entries = Array.isArray(value) ? value : [value];
  const items: OfflineQueueItem[] = [];
  const rejected: RejectedOfflineQueueEntry[] = [];

  entries.forEach((entry, index) => {
    const review = reviewPersistedEntry(entry, index, now);

    if (review.kind === "item") {
      items.push(review.item);
    } else {
      rejected.push(review.rejected);
    }
  });

  return { items, rejected };
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
 *
 * A derived label reads `unknown`, not that action's payload type, because this
 * table also names entries the persisted-queue validation refused. Those have a
 * known action and a payload the domain would not accept, so a label may only
 * read one defensively.
 */
const queueActionLabels: Record<
  OfflineQueueAction,
  string | ((payload: unknown) => string)
> = {
  arrival_notification_create: arrivalNotificationLabel,
  chemical_log_create: "Chemical log",
  form_submission_create: "Treatment form",
  geofence_event_create: geofenceEventLabel,
  job_status_update: "Status update",
  photo_upload: "Photo capture",
  signature_capture: "Signature",
};

function queueActionLabel(action: OfflineQueueAction, payload: unknown) {
  const label = queueActionLabels[action];

  return typeof label === "string" ? label : label(payload);
}

export function getOfflineQueueItemLabel<TAction extends OfflineQueueAction>(
  item: OfflineQueueItem<TAction>,
) {
  return `${queueActionLabel(item.action, item.payload)} for ${payloadJobLabel(
    item.payload,
  )}`;
}

function rejectedEntryLabel(entry: RejectedOfflineQueueEntry) {
  if (!entry.action) {
    return "Unreadable saved change";
  }

  const payload = isRecord(entry.entry) ? entry.entry.payload : null;

  return `${queueActionLabel(entry.action, payload)} for ${payloadJobLabel(
    payload,
  )}`;
}

export interface OfflineQueueRecoveryItem {
  action: OfflineQueueAction | null;
  id: string;
  label: string;
  lastError: string;
  outcome: MutationOutcomeKind | null;
}

/**
 * The queue work a technician has to resolve by hand, as one list.
 *
 * `failed` is exactly that set for queue items: `packages/sync` marks an item
 * failed only when the resolved outcome is not retryable, so the queue has
 * stopped working on it and nothing but a person will move it. Entries the
 * persisted-queue validation refused join the same list rather than a second
 * one built beside it, so unreadable field work reaches the technician through
 * the recovery interaction that already exists.
 */
export function getOfflineQueueRecoveryItems(
  items: OfflineQueueItem[],
  rejected: RejectedOfflineQueueEntry[] = [],
): OfflineQueueRecoveryItem[] {
  return [
    ...items
      .filter((item) => item.status === "failed")
      .map((item) => ({
        action: item.action,
        id: item.id,
        label: getOfflineQueueItemLabel(item),
        lastError: item.last_error ?? "Sync failed",
        outcome: item.outcome,
      })),
    ...rejected.map((entry) => ({
      action: entry.action,
      id: entry.id,
      label: rejectedEntryLabel(entry),
      lastError: entry.last_error,
      outcome: entry.outcome,
    })),
  ];
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
