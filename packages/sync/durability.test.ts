import { beforeEach, describe, expect, it, vi } from "vitest";

import { createOfflineQueueItem } from "@pest-patrol/domain";
import type { OfflineSyncPort } from "@pest-patrol/application";
import type { OfflineQueueItem } from "@pest-patrol/types";

import {
  processOfflineQueueItem,
  processOfflineQueueItems,
} from "./offlineSync";

/**
 * Durability tests, which `docs/architecture.md` requires of CR06.
 *
 * `offlineSync.test.ts` covers one action at a time: does this payload reach
 * this port method, and does a failure mark the item retrying. That is the
 * per-action mapping. It never asks the questions that make the queue durable
 * rather than merely correct — whether an item survives a restart, whether the
 * array the caller persists is the whole next state, whether a replay is the
 * same logical write as the attempt it repeats.
 *
 * These tests ask those. They drive `processOfflineQueueItems`, the entry point
 * `apps/mobile/src/store/useQueueSync.ts` actually calls, and they cross a
 * simulated restart by persisting through JSON: an item that cannot survive
 * that round trip is not durable, whatever its in-memory behaviour.
 */

function createStubPort() {
  return {
    createChemicalLogRecord: vi.fn(),
    createGeneratedNotificationEventRecord: vi.fn(),
    createJobGeofenceEventRecord: vi.fn(),
    createJobFormSubmissionRecord: vi.fn(),
    uploadJobPhotoRecord: vi.fn(),
    uploadJobSignatureRecord: vi.fn(),
    updateAssignedTechnicianJobStatusRecord: vi.fn(),
  };
}

let port: ReturnType<typeof createStubPort>;

// The stub is structurally a port; this line fails to compile if it drifts.
const _portShapeCheck: (
  p: ReturnType<typeof createStubPort>,
) => OfflineSyncPort = (p) => p;
void _portShapeCheck;

beforeEach(() => {
  port = createStubPort();
});

/**
 * A stored queue item whose payload its action forbids.
 *
 * CR07 made the payload follow from the action, so this pairing can no longer
 * be written directly. The runtime guard it exercises is still load bearing:
 * `apps/mobile` hydrates its queue from storage without validating it, so an
 * item written by an older build can still arrive malformed. Checking at that
 * boundary is CR09's. Until then, deliberate violations go through this one
 * builder rather than an inline cast.
 */
function untrustedQueueItem(
  item: OfflineQueueItem,
  payload: unknown,
): OfflineQueueItem {
  return { ...item, payload } as OfflineQueueItem;
}

const enqueuedAt = "2026-05-05T20:00:00.000Z";

function formItem(id = "queue-form-1") {
  return createOfflineQueueItem(
    {
      action: "form_submission_create",
      payload: {
        job_id: "job-1",
        template_id: "template-1",
        form_data: { target_pests: "Ants" },
      },
    },
    { id, now: enqueuedAt },
  );
}

function statusItem(id = "queue-status-1") {
  return createOfflineQueueItem(
    {
      action: "job_status_update",
      payload: {
        job_id: "job-1",
        status: "in_progress",
        previous_status: "en_route",
      },
    },
    { id, now: enqueuedAt },
  );
}

/**
 * Everything the queue writes to disk and reads back on the next launch.
 *
 * Going through JSON is the point: it is what the store's persisted state
 * actually does, and it is what would drop a `Date`, a `Map`, or a value the
 * item carried only by closure.
 */
function restart<TItem>(items: TItem[]): TItem[] {
  return JSON.parse(JSON.stringify(items)) as TItem[];
}

describe("durable identity and state", () => {
  it("keeps a queue item's identity across every transition", async () => {
    const item = formItem();

    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );
    const retrying = await processOfflineQueueItem(port, item, {
      now: "2026-05-05T20:01:00.000Z",
    });

    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );
    const failed = await processOfflineQueueItem(port, retrying, {
      maxAttempts: 2,
      now: "2026-05-05T20:05:00.000Z",
    });

    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);
    const synced = await processOfflineQueueItem(port, formItem(), {
      now: "2026-05-05T20:06:00.000Z",
    });

    for (const next of [retrying, failed, synced]) {
      expect(next.id, next.status).toBe(item.id);
      expect(next.action, next.status).toBe(item.action);
      expect(next.created_at, next.status).toBe(item.created_at);
    }

    expect(retrying.status).toBe("retrying");
    expect(failed.status).toBe("failed");
    expect(synced.status).toBe("synced");
  });

  it("writes a complete durable record, not a partial patch", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const next = await processOfflineQueueItem(port, formItem(), {
      now: "2026-05-05T20:01:00.000Z",
      retryDelayMs: 120_000,
    });

    // The store persists whatever the queue returns, so a missing field is a
    // field lost at the next launch rather than a field left alone.
    expect(Object.keys(next).sort()).toEqual([
      "action",
      "attempts",
      "created_at",
      "id",
      "last_error",
      "next_retry_at",
      "outcome",
      "payload",
      "status",
      "updated_at",
    ]);
    expect(next.updated_at).toBe("2026-05-05T20:01:00.000Z");
    expect(next.updated_at).not.toBe(next.created_at);

    // Presence is not enough. Everything the next launch needs in order to
    // decide what to do with this item — why it failed, how many attempts it
    // has spent, when it may be tried again — has to survive being written to
    // disk and read back, or the queue relearns nothing from the last run.
    const [reloaded] = restart([next]);
    expect(reloaded).toEqual(next);
    expect(reloaded).toMatchObject({
      attempts: 1,
      last_error: "Network unavailable",
      next_retry_at: "2026-05-05T20:03:00.000Z",
      status: "retrying",
    });
  });
});

describe("persistence", () => {
  it("returns the whole next queue state, in order", async () => {
    const ready = formItem("queue-ready");
    const deferred: OfflineQueueItem = {
      ...formItem("queue-deferred"),
      status: "retrying",
      next_retry_at: "2026-05-05T20:30:00.000Z",
    };
    const settled: OfflineQueueItem = {
      ...statusItem("queue-settled"),
      status: "synced",
    };

    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);

    const result = await processOfflineQueueItems(
      port,
      [ready, deferred, settled],
      { now: "2026-05-05T20:01:00.000Z" },
    );

    // `useQueueSync` calls `replaceItems(result.items)`. Anything the queue
    // drops here is deleted from the device, so the result must carry every
    // input item, including the ones it decided not to touch.
    expect(result.items.map((item) => item.id)).toEqual([
      "queue-ready",
      "queue-deferred",
      "queue-settled",
    ]);
    expect(result.summary).toEqual({
      failed: 0,
      processed: 1,
      retrying: 0,
      skipped: 2,
      synced: 1,
    });
  });

  it("returns untouched items unchanged, by identity", async () => {
    const deferred: OfflineQueueItem = {
      ...formItem("queue-deferred"),
      status: "retrying",
      next_retry_at: "2026-05-05T20:30:00.000Z",
    };

    const result = await processOfflineQueueItems(port, [deferred], {
      now: "2026-05-05T20:01:00.000Z",
    });

    // Reference identity is how the summary tells skipped from processed, and
    // it is what lets a caller diff the persisted array cheaply.
    expect(result.items[0]).toBe(deferred);
    expect(port.createJobFormSubmissionRecord).not.toHaveBeenCalled();
  });
});

describe("restart replay", () => {
  it("resumes a retrying item after a restart, once its backoff has passed", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const firstPass = await processOfflineQueueItems(port, [formItem()], {
      now: "2026-05-05T20:01:00.000Z",
      retryDelayMs: 120_000,
    });
    expect(firstPass.items[0].status).toBe("retrying");
    expect(firstPass.items[0].next_retry_at).toBe("2026-05-05T20:03:00.000Z");

    // The app closes here, and the persisted queue is read back on launch.
    const afterRestart = restart(firstPass.items);
    expect(afterRestart).toEqual(firstPass.items);

    const tooSoon = await processOfflineQueueItems(port, afterRestart, {
      now: "2026-05-05T20:02:00.000Z",
    });
    expect(tooSoon.summary.skipped).toBe(1);
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(1);

    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);
    const dueNow = await processOfflineQueueItems(port, tooSoon.items, {
      now: "2026-05-05T20:03:00.000Z",
    });

    expect(dueNow.items[0].status).toBe("synced");
    expect(dueNow.items[0].id).toBe("queue-form-1");
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(2);
  });

  it("does not replay work a previous run already completed", async () => {
    port.updateAssignedTechnicianJobStatusRecord.mockResolvedValueOnce(
      {} as never,
    );

    const firstPass = await processOfflineQueueItems(port, [statusItem()], {
      now: "2026-05-05T20:01:00.000Z",
    });
    expect(firstPass.items[0].status).toBe("synced");

    const secondPass = await processOfflineQueueItems(
      port,
      restart(firstPass.items),
      { now: "2026-05-05T20:02:00.000Z" },
    );

    // A restart that re-synced settled items would duplicate every write the
    // device ever made.
    expect(secondPass.summary.skipped).toBe(1);
    expect(port.updateAssignedTechnicianJobStatusRecord).toHaveBeenCalledTimes(
      1,
    );
  });
});

describe("retry and backoff scheduling", () => {
  it("schedules each backoff from the attempt that failed, across restarts", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValue(
      new Error("Network unavailable"),
    );

    const first = await processOfflineQueueItems(port, [formItem()], {
      maxAttempts: 5,
      now: "2026-05-05T20:01:00.000Z",
      retryDelayMs: 60_000,
    });
    expect(first.items[0]).toMatchObject({
      attempts: 1,
      next_retry_at: "2026-05-05T20:02:00.000Z",
      status: "retrying",
    });

    const second = await processOfflineQueueItems(port, restart(first.items), {
      maxAttempts: 5,
      now: "2026-05-05T20:02:00.000Z",
      retryDelayMs: 300_000,
    });

    // The next attempt is measured from the attempt that just failed, not from
    // when the item was enqueued, so a device offline for an hour does not come
    // back to an hour of overdue retries.
    expect(second.items[0]).toMatchObject({
      attempts: 2,
      next_retry_at: "2026-05-05T20:07:00.000Z",
      status: "retrying",
    });
  });

  it("stops scheduling once the attempt budget is spent", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValue(
      new Error("Permission denied"),
    );

    const first = await processOfflineQueueItems(port, [formItem()], {
      maxAttempts: 2,
      now: "2026-05-05T20:01:00.000Z",
      retryDelayMs: 60_000,
    });
    const second = await processOfflineQueueItems(port, restart(first.items), {
      maxAttempts: 2,
      now: "2026-05-05T20:02:00.000Z",
      retryDelayMs: 60_000,
    });

    expect(second.items[0]).toMatchObject({
      attempts: 2,
      last_error: "Permission denied",
      next_retry_at: null,
      status: "failed",
    });
    expect(second.summary.failed).toBe(1);
  });
});

describe("durable transitions", () => {
  it("treats a failed item as terminal rather than retrying it forever", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValue(
      new Error("Permission denied"),
    );

    const failed = await processOfflineQueueItems(port, [formItem()], {
      maxAttempts: 1,
      now: "2026-05-05T20:01:00.000Z",
    });
    expect(failed.items[0].status).toBe("failed");
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(1);

    const later = await processOfflineQueueItems(port, restart(failed.items), {
      now: "2026-06-01T00:00:00.000Z",
    });

    // Terminal means terminal: the technician has to see this one, and a queue
    // that quietly kept retrying is a queue that hides it.
    expect(later.summary).toMatchObject({ processed: 0, skipped: 1 });
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(1);
    expect(later.items[0].status).toBe("failed");
  });

  it("marks a permanently invalid payload failed without spending the budget", async () => {
    const malformed = untrustedQueueItem(formItem("queue-malformed"), {
      job_id: "job-1",
    });

    const result = await processOfflineQueueItems(port, [malformed], {
      now: "2026-05-05T20:01:00.000Z",
    });

    // No retry can make this payload valid, so it never reaches the port.
    expect(result.items[0]).toMatchObject({
      attempts: 0,
      next_retry_at: null,
      status: "failed",
    });
    expect(port.createJobFormSubmissionRecord).not.toHaveBeenCalled();
  });
});

describe("stable identity across retry", () => {
  it("replays the same logical write rather than minting a second one", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = formItem();
    const firstPass = await processOfflineQueueItems(port, [item], {
      now: "2026-05-05T20:01:00.000Z",
      retryDelayMs: 60_000,
    });

    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);
    const secondPass = await processOfflineQueueItems(
      port,
      restart(firstPass.items),
      { now: "2026-05-05T20:02:00.000Z" },
    );

    expect(secondPass.items[0].id).toBe(item.id);
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(2);

    // Same identity, same arguments: the provider sees one intent attempted
    // twice, which is what makes an ambiguous first response safe to replay.
    const [firstCall, secondCall] =
      port.createJobFormSubmissionRecord.mock.calls;
    expect(secondCall).toEqual(firstCall);
  });

  it("carries the intent's payload through a failure unchanged", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = formItem();
    const original = structuredClone(item.payload);

    const result = await processOfflineQueueItems(port, [item], {
      now: "2026-05-05T20:01:00.000Z",
    });

    expect(result.items[0].payload).toEqual(original);
  });
});
