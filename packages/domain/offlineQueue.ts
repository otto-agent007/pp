import type {
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
