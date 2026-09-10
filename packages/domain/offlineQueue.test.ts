import { describe, expect, it } from "vitest";

import type { OfflineQueueAction, OfflineQueueInput } from "@pest-patrol/types";

import { queueItem, queuePayload } from "./fixtures/offlineQueue";
import {
  clearSyncedQueueItems,
  createOfflineQueueItem,
  discardQueueItem,
  discardRejectedQueueEntry,
  getOfflineQueueItemLabel,
  getOfflineQueueJobTriage,
  getOfflineQueueRecoveryItems,
  getOfflineQueueSummary,
  markQueueItemFailed,
  markQueueItemRetrying,
  markQueueItemSynced,
  reviewPersistedOfflineQueue,
} from "./offlineQueue";

const now = "2026-05-05T12:00:00.000Z";

/**
 * A queue input the type system forbids, for the one test that proves the
 * runtime guard still rejects it.
 *
 * CR07 made the payload follow from the action, so a malformed input can no
 * longer be written directly. The guard is still worth having: a value that
 * reaches the queue from outside the type system is checked at runtime, which
 * is what `reviewPersistedOfflineQueue` does for a queue read back from a
 * device. The deliberate violation goes through this builder so it stays
 * greppable instead of hiding in an inline cast.
 */
function untrustedQueueInput(
  action: OfflineQueueAction,
  payload: unknown,
): OfflineQueueInput {
  return { action, payload } as OfflineQueueInput;
}

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
      createOfflineQueueItem(untrustedQueueInput("job_status_update", undefined), {
        id: "queue-1",
        now,
      }),
    ).toThrow("Queue payload is required");

    expect(() =>
      createOfflineQueueItem(
        { action: "job_status_update", payload: queuePayload("job_status_update") },
        { id: " ", now },
      ),
    ).toThrow("Queue id is required");
  });

  it("increments attempts and schedules retry metadata", () => {
    const item = createOfflineQueueItem(
      {
        action: "chemical_log_create",
        payload: queuePayload("chemical_log_create"),
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
      { action: "photo_upload", payload: queuePayload("photo_upload") },
      { id: "queue-1", now },
    );
    const synced = markQueueItemSynced(queued, {
      now: "2026-05-05T12:05:00.000Z",
    });

    expect(synced.status).toBe("synced");
    expect(synced.last_error).toBeNull();
    expect(clearSyncedQueueItems([queued, synced])).toEqual([queued]);
  });

  it("scrubs synced photo and signature proof payloads while retaining safe metadata", () => {
    const photo = markQueueItemSynced(
      createOfflineQueueItem(
        {
          action: "photo_upload",
          payload: {
            job_id: "job-1",
            local_uri: "file:///photo.jpg",
            uri: "file:///photo.jpg",
            base64_data: "raw-photo",
            file_name: "photo.jpg",
            content_type: "image/jpeg",
            storage_bucket: "job-media",
            storage_path: "job-1/photo.jpg",
            description: "Kitchen",
            captured_at: now,
          },
        },
        { id: "queue-photo-1", now },
      ),
      { now },
    );
    const signature = markQueueItemSynced(
      createOfflineQueueItem(
        {
          action: "signature_capture",
          payload: {
            job_id: "job-1",
            local_uri: "data:image/png;base64,signature",
            data_url: "data:image/png;base64,signature",
            signature_data: "raw-signature",
            file_name: "signature.png",
            content_type: "image/png",
            storage_bucket: "job-media",
            storage_path: "job-1/signature.png",
            signer_name: "Jamie Customer",
            captured_at: now,
          },
        },
        { id: "queue-signature-1", now },
      ),
      { now },
    );

    expect(photo.payload).toEqual({
      job_id: "job-1",
      file_name: "photo.jpg",
      content_type: "image/jpeg",
      storage_bucket: "job-media",
      storage_path: "job-1/photo.jpg",
      description: "Kitchen",
      captured_at: now,
    });
    expect(signature.payload).toEqual({
      job_id: "job-1",
      file_name: "signature.png",
      content_type: "image/png",
      storage_bucket: "job-media",
      storage_path: "job-1/signature.png",
      signer_name: "Jamie Customer",
      captured_at: now,
    });
    expect(getOfflineQueueItemLabel(photo)).toBe("Photo capture for job job-1");
    expect(getOfflineQueueItemLabel(signature)).toBe("Signature for job job-1");
  });

  it("leaves non-proof synced payloads intact", () => {
    const queued = createOfflineQueueItem(
      {
        action: "chemical_log_create",
        payload: {
          ...queuePayload("chemical_log_create"),
          local_uri: "not-proof",
          notes: "Baseboards",
        },
      },
      { id: "queue-chemical-1", now },
    );

    expect(markQueueItemSynced(queued, { now }).payload).toEqual(queued.payload);
  });

  it("summarizes pending, failed, synced, and next retry counts", () => {
    const queued = createOfflineQueueItem(
      { action: "job_status_update", payload: queuePayload("job_status_update") },
      { id: "queue-1", now },
    );
    const retrying = markQueueItemRetrying(queued, "Offline", {
      now,
      retryDelayMs: 60_000,
    });
    const synced = markQueueItemSynced(
      createOfflineQueueItem(
        {
          action: "signature_capture",
          payload: queuePayload("signature_capture", "job-2"),
        },
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

  it("labels queued field captures by action and job", () => {
    expect(
      getOfflineQueueItemLabel(
        createOfflineQueueItem(
          {
            action: "form_submission_create",
            payload: queuePayload("form_submission_create"),
          },
          { id: "queue-1", now },
        ),
      ),
    ).toBe("Treatment form for job job-1");

    expect(
      getOfflineQueueItemLabel(
        createOfflineQueueItem(
          {
            action: "geofence_event_create",
            payload: {
              ...queuePayload("geofence_event_create", "job-2"),
              event_type: "arrival",
            },
          },
          { id: "queue-2", now },
        ),
      ),
    ).toBe("Arrival geofence for job job-2");

    expect(
      getOfflineQueueItemLabel(
        createOfflineQueueItem(
          {
            action: "arrival_notification_create",
            payload: {
              job_id: "job-3",
              client_event_id: "event-1",
              decision: "delay_5_min",
              captured_at: now,
            },
          },
          { id: "queue-3", now },
        ),
      ),
    ).toBe("Arrival notice delayed 5 min for job job-3");
  });

  it("summarizes queued work by job for route stop triage", () => {
    const queued = createOfflineQueueItem(
      { action: "photo_upload", payload: queuePayload("photo_upload") },
      { id: "queue-1", now },
    );
    const retrying = markQueueItemRetrying(
      createOfflineQueueItem(
        {
          action: "signature_capture",
          payload: queuePayload("signature_capture"),
        },
        { id: "queue-2", now },
      ),
      "Offline",
      { now },
    );
    const synced = markQueueItemSynced(
      createOfflineQueueItem(
        {
          action: "form_submission_create",
          payload: queuePayload("form_submission_create"),
        },
        { id: "queue-3", now },
      ),
      { now },
    );

    expect(getOfflineQueueJobTriage([queued, retrying, synced], "job-1")).toEqual({
      failed: 0,
      jobId: "job-1",
      label: "2 pending sync, 1 synced",
      pending: 2,
      queued: 1,
      retrying: 1,
      state: "retrying",
      synced: 1,
      total: 3,
    });
  });

  it("prioritizes failed route stop sync state", () => {
    const failed = createOfflineQueueItem(
      { action: "chemical_log_create", payload: queuePayload("chemical_log_create") },
      { id: "queue-1", now },
    );

    expect(
      getOfflineQueueJobTriage(
        [{ ...failed, status: "failed", last_error: "Rejected" }],
        "job-1",
      ),
    ).toMatchObject({
      failed: 1,
      label: "1 failed sync item",
      state: "failed",
    });
  });

  it("returns a quiet route stop sync state when a job has no queue work", () => {
    expect(getOfflineQueueJobTriage([], "job-1")).toEqual({
      failed: 0,
      jobId: "job-1",
      label: "No local sync work",
      pending: 0,
      queued: 0,
      retrying: 0,
      state: "idle",
      synced: 0,
      total: 0,
    });
  });
});

describe("persisted offline queue validation", () => {
  it("reads a well-formed persisted queue back with its envelope intact", () => {
    const stored = [
      queueItem("job_status_update", { id: "queue-1" }),
      queueItem("chemical_log_create", {
        attempts: 2,
        id: "queue-2",
        last_error: "Sync failed",
        next_retry_at: "2026-05-05T12:01:00.000Z",
        outcome: "retryable",
        status: "retrying",
      }),
    ];

    const review = reviewPersistedOfflineQueue(
      JSON.parse(JSON.stringify(stored)),
      { now },
    );

    expect(review.rejected).toEqual([]);
    expect(review.items).toEqual([
      stored[0],
      // The payload comes back canonical rather than byte-identical: the
      // action's own normalizer produced it, which is what makes checking it
      // possible at all. `notes` is the optional field that shows the
      // difference.
      { ...stored[1], payload: { ...stored[1]?.payload, notes: null } },
    ]);
  });

  it("keeps the file size a proof payload was queued with", () => {
    const stored = queueItem("photo_upload", { id: "queue-1" });

    const review = reviewPersistedOfflineQueue(
      [{ ...stored, payload: { ...stored.payload, file_size_bytes: 2048 } }],
      { now },
    );

    expect(review.rejected).toEqual([]);
    expect(review.items[0]?.payload).toEqual(
      expect.objectContaining({ file_size_bytes: 2048 }),
    );
  });

  it("keeps an item whose payload the domain refuses, rather than dropping it", () => {
    const review = reviewPersistedOfflineQueue(
      [
        {
          ...queueItem("job_status_update", { id: "queue-1" }),
          payload: { job_id: "job-1", status: "teleporting" },
        },
      ],
      { now },
    );

    expect(review.items).toEqual([]);
    expect(review.rejected).toEqual([
      {
        action: "job_status_update",
        entry: expect.objectContaining({ id: "queue-1" }),
        id: "queue-1",
        last_error: "Job status is invalid",
        outcome: "terminal",
        status: "failed",
      },
    ]);
  });

  it("keeps an entry naming an action this app does not know", () => {
    const review = reviewPersistedOfflineQueue(
      [{ action: "teleport_technician", id: "queue-9", payload: { job_id: "job-1" } }],
      { now },
    );

    expect(review.items).toEqual([]);
    expect(review.rejected).toEqual([
      {
        action: null,
        entry: expect.objectContaining({ action: "teleport_technician" }),
        id: "queue-9",
        last_error: "Saved change names an action this app does not know",
        outcome: "terminal",
        status: "failed",
      },
    ]);
  });

  it("keeps a value that is not a queue record at all, under a usable id", () => {
    const review = reviewPersistedOfflineQueue(["not-a-record"], { now });

    expect(review.rejected).toEqual([
      {
        action: null,
        entry: "not-a-record",
        id: "unreadable-1",
        last_error: "Saved change is not a queue record",
        outcome: "terminal",
        status: "failed",
      },
    ]);
  });

  it("reviews a stored value that is not an array as a single entry", () => {
    const review = reviewPersistedOfflineQueue({ queue: "gone" }, { now });

    expect(review.items).toEqual([]);
    expect(review.rejected).toHaveLength(1);
    expect(review.rejected[0]?.entry).toEqual({ queue: "gone" });
  });

  it("marks an item terminal when its envelope is present but unreadable", () => {
    const review = reviewPersistedOfflineQueue(
      [
        {
          ...queueItem("job_status_update", { id: "queue-1" }),
          attempts: "many",
          status: "sideways",
        },
      ],
      { now },
    );

    expect(review.rejected).toEqual([]);
    expect(review.items).toEqual([
      expect.objectContaining({
        attempts: 0,
        id: "queue-1",
        last_error: "Saved change was stored with unreadable attempts, status",
        outcome: "terminal",
        status: "failed",
        updated_at: now,
      }),
    ]);
  });

  it("defaults a field the record predates instead of calling it damage", () => {
    const { outcome, ...withoutOutcome } = queueItem("photo_upload", {
      id: "queue-1",
    });

    void outcome;

    const review = reviewPersistedOfflineQueue([withoutOutcome], { now });

    expect(review.rejected).toEqual([]);
    expect(review.items).toEqual([
      expect.objectContaining({ id: "queue-1", outcome: null, status: "queued" }),
    ]);
  });
});

describe("offline queue recovery", () => {
  it("lists failed items and rejected entries as one recovery list", () => {
    const failed = markQueueItemFailed(
      queueItem("chemical_log_create", { id: "queue-1" }),
      "Chemical is not available",
      { now, outcome: "conflict" },
    );
    const { rejected } = reviewPersistedOfflineQueue(
      [
        {
          ...queueItem("photo_upload", { id: "queue-2", jobId: "job-7" }),
          payload: { job_id: "job-7" },
        },
      ],
      { now },
    );

    expect(
      getOfflineQueueRecoveryItems(
        [queueItem("job_status_update", { id: "queue-0" }), failed],
        rejected,
      ),
    ).toEqual([
      {
        action: "chemical_log_create",
        id: "queue-1",
        label: "Chemical log for job job-1",
        lastError: "Chemical is not available",
        outcome: "conflict",
      },
      {
        action: "photo_upload",
        id: "queue-2",
        label: "Photo capture for job job-7",
        lastError: "Photo is required",
        outcome: "terminal",
      },
    ]);
  });

  it("labels a rejected entry whose action is unknown without reading its payload", () => {
    const { rejected } = reviewPersistedOfflineQueue([42], { now });

    expect(getOfflineQueueRecoveryItems([], rejected)).toEqual([
      {
        action: null,
        id: "unreadable-1",
        label: "Unreadable saved change",
        lastError: "Saved change is not a queue record",
        outcome: "terminal",
      },
    ]);
  });

  it("discards a failed item and leaves work the queue is still doing", () => {
    const queued = queueItem("job_status_update", { id: "queue-1" });
    const failed = markQueueItemFailed(
      queueItem("photo_upload", { id: "queue-2" }),
      "Upload failed",
      { now },
    );
    const retrying = markQueueItemRetrying(
      queueItem("chemical_log_create", { id: "queue-3" }),
      "Network failed",
      { now },
    );
    const items = [queued, failed, retrying];

    expect(discardQueueItem(items, "queue-2")).toEqual([queued, retrying]);
    expect(discardQueueItem(items, "queue-1")).toEqual(items);
    expect(discardQueueItem(items, "queue-3")).toEqual(items);
  });

  it("discards a rejected entry by the id the recovery list shows", () => {
    const { rejected } = reviewPersistedOfflineQueue([1, 2], { now });

    expect(
      discardRejectedQueueEntry(rejected, "unreadable-1").map((entry) => entry.id),
    ).toEqual(["unreadable-2"]);
  });
});
