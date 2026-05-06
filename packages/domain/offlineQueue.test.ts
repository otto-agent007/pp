import { describe, expect, it } from "vitest";

import {
  clearSyncedQueueItems,
  createOfflineQueueItem,
  getOfflineQueueSummary,
  markQueueItemRetrying,
  markQueueItemSynced,
} from "./offlineQueue";

const now = "2026-05-05T12:00:00.000Z";

describe("offline queue domain", () => {
  it("creates queued items with retry metadata cleared", () => {
    const item = createOfflineQueueItem(
      {
        action: "job_status_update",
        payload: { job_id: "job-1", status: "en_route" },
      },
      { id: " queue-1 ", now },
    );

    expect(item).toMatchObject({
      id: "queue-1",
      action: "job_status_update",
      attempts: 0,
      created_at: now,
      last_error: null,
      next_retry_at: null,
      status: "queued",
      updated_at: now,
    });
  });

  it("rejects queue items without payloads or ids", () => {
    expect(() =>
      createOfflineQueueItem(
        { action: "job_status_update", payload: undefined },
        { id: "queue-1", now },
      ),
    ).toThrow("Queue payload is required");

    expect(() =>
      createOfflineQueueItem(
        { action: "job_status_update", payload: { job_id: "job-1" } },
        { id: " ", now },
      ),
    ).toThrow("Queue id is required");
  });

  it("increments attempts and schedules retry metadata", () => {
    const item = createOfflineQueueItem(
      {
        action: "chemical_log_create",
        payload: { job_id: "job-1", amount_used: 2 },
      },
      { id: "queue-1", now },
    );

    const retrying = markQueueItemRetrying(item, "Network unavailable", {
      now,
      retryDelayMs: 120_000,
    });

    expect(retrying).toMatchObject({
      attempts: 1,
      last_error: "Network unavailable",
      next_retry_at: "2026-05-05T12:02:00.000Z",
      status: "retrying",
      updated_at: now,
    });
  });

  it("marks synced items and clears synced queue entries", () => {
    const queued = createOfflineQueueItem(
      { action: "photo_upload", payload: { job_id: "job-1" } },
      { id: "queue-1", now },
    );
    const synced = markQueueItemSynced(queued, {
      now: "2026-05-05T12:05:00.000Z",
    });

    expect(synced.status).toBe("synced");
    expect(synced.last_error).toBeNull();
    expect(clearSyncedQueueItems([queued, synced])).toEqual([queued]);
  });

  it("summarizes pending, failed, synced, and next retry counts", () => {
    const queued = createOfflineQueueItem(
      { action: "job_status_update", payload: { job_id: "job-1" } },
      { id: "queue-1", now },
    );
    const retrying = markQueueItemRetrying(queued, "Offline", {
      now,
      retryDelayMs: 60_000,
    });
    const synced = markQueueItemSynced(
      createOfflineQueueItem(
        { action: "signature_capture", payload: { job_id: "job-2" } },
        { id: "queue-2", now },
      ),
      { now },
    );

    expect(getOfflineQueueSummary([queued, retrying, synced])).toEqual({
      failed: 0,
      nextRetryAt: "2026-05-05T12:01:00.000Z",
      pending: 2,
      queued: 1,
      retrying: 1,
      synced: 1,
      total: 3,
    });
  });
});
