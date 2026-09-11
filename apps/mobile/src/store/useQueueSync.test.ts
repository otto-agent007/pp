import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineQueueRecoveryItems } from "@pest-patrol/domain";
import type { JobStatusUpdateQueuePayload } from "@pest-patrol/types";

import { useOfflineQueue } from "./useOfflineQueue";
import { useQueueSync } from "./useQueueSync";
import { useSyncStatus } from "./useSyncStatus";

/**
 * The mobile composition root, wired the way the app wires it.
 *
 * Only the two things that are genuinely the device are stood in for: secure
 * storage and the Supabase client `apps/mobile/src/lib/supabase.ts` builds from
 * environment variables. Everything between them is the real thing - the real
 * zustand stores, `@pest-patrol/domain`'s queue rules, `@pest-patrol/sync`'s
 * processing, and `@pest-patrol/api-client`'s offline-sync adapter, including
 * the failure interpretation that turns a provider code into a reason. Nothing
 * exercised this path end to end before: there was no test for this module at
 * all, and `SyncStatusIndicator.test.tsx` mocks every store it reads.
 */

const asyncStorage = vi.hoisted(() => {
  const values = new Map<string, string>();

  return {
    values,
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
});

const provider = vi.hoisted(() => ({
  calls: [] as { args: Record<string, unknown>; fn: string }[],
  result: { data: null as unknown, error: null as unknown },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorage,
}));

vi.mock("../lib/supabase", () => ({
  mobileSupabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      provider.calls.push({ args, fn });

      return {
        select: () => ({
          single: async () => provider.result,
        }),
      };
    },
  },
}));

const QUEUE_KEY = "pest-patrol:offline-queue:v1";

const statusPayload: JobStatusUpdateQueuePayload = {
  job_id: "job-1",
  previous_status: "scheduled",
  status: "en_route",
};

function storedQueue(): unknown[] {
  return JSON.parse(asyncStorage.values.get(QUEUE_KEY) ?? "[]") as unknown[];
}

/** Drop every trace of the running app, keeping only what the device holds. */
async function restartApp() {
  useOfflineQueue.setState({ items: [], rejected: [] });
  await useOfflineQueue.getState().hydrate();
}

describe("mobile queue composition root", () => {
  beforeEach(() => {
    asyncStorage.values.clear();
    asyncStorage.removeItem.mockClear();
    asyncStorage.getItem.mockClear();
    asyncStorage.setItem.mockClear();
    provider.calls.length = 0;
    provider.result = { data: null, error: null };
    useOfflineQueue.setState({ items: [], rejected: [] });
    useSyncStatus.setState({
      activity: "idle",
      lastError: null,
      lastSyncAt: null,
      networkStatus: "online",
    });
  });

  it("carries field work from enqueue through restart to adapter acknowledgment", async () => {
    const queued = useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: statusPayload,
    });

    // Optimistic projection: the item is the store's state immediately, before
    // anything has reached the provider.
    expect(useOfflineQueue.getState().items).toEqual([queued]);
    expect(provider.calls).toEqual([]);

    // Durable enqueue: it is on the device, not only in memory.
    expect(storedQueue()).toEqual([JSON.parse(JSON.stringify(queued))]);

    await restartApp();

    expect(useOfflineQueue.getState().items).toEqual([queued]);
    expect(useOfflineQueue.getState().rejected).toEqual([]);

    provider.result = {
      data: { id: "job-1", status: "en_route" },
      error: null,
    };

    await useQueueSync.getState().syncNow();

    // The adapter acknowledged it: the real RPC call was made with the payload
    // the domain normalized, and the item carries the applied outcome.
    expect(provider.calls).toEqual([
      {
        fn: "update_assigned_job_status",
        args: {
          p_expected_previous_status: "scheduled",
          p_job_id: "job-1",
          p_next_status: "en_route",
        },
      },
    ]);
    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({
        id: queued.id,
        outcome: "applied",
        status: "synced",
      }),
    ]);
    expect(useSyncStatus.getState().lastError).toBeNull();
    expect(useSyncStatus.getState().lastSyncAt).not.toBeNull();

    // And the acknowledgment is durable too.
    await restartApp();

    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({ id: queued.id, status: "synced" }),
    ]);
  });

  it("stops on a conflict the provider reports, and lets the technician discard it", async () => {
    const queued = useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: statusPayload,
    });

    provider.result = {
      data: null,
      error: { code: "PP409", message: "Job status transition is not allowed" },
    };

    await useQueueSync.getState().syncNow();

    // A conflict is not retryable, so the queue stops on the first attempt
    // rather than spending the budget: the technician has to look at the job.
    const [failed] = useOfflineQueue.getState().items;

    expect(failed).toEqual(
      expect.objectContaining({
        attempts: 1,
        id: queued.id,
        last_error: "Job status transition is not allowed",
        next_retry_at: null,
        outcome: "conflict",
        status: "failed",
      }),
    );
    expect(useSyncStatus.getState().lastError).toBe(
      "Some queued changes failed to sync",
    );

    // Syncing again leaves it alone: a failed item is not ready.
    provider.calls.length = 0;
    await useQueueSync.getState().syncNow();

    expect(provider.calls).toEqual([]);

    expect(getOfflineQueueRecoveryItems([failed!], [])).toEqual([
      expect.objectContaining({
        id: queued.id,
        label: "Status update for job job-1",
        lastError: "Job status transition is not allowed",
        outcome: "conflict",
      }),
    ]);

    useOfflineQueue.getState().discard(queued.id);

    expect(useOfflineQueue.getState().items).toEqual([]);
    expect(storedQueue()).toEqual([]);
  });

  it("retries a failure the provider may recover from instead of stopping", async () => {
    useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: statusPayload,
    });

    provider.result = {
      data: null,
      error: { message: "Network request failed" },
    };

    await useQueueSync.getState().syncNow();

    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({
        attempts: 1,
        outcome: "retryable",
        status: "retrying",
      }),
    ]);
    expect(getOfflineQueueRecoveryItems(useOfflineQueue.getState().items)).toEqual(
      [],
    );
  });

  it("keeps a persisted item it cannot read, and surfaces it for recovery", async () => {
    const queued = useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: statusPayload,
    });
    const unreadable = {
      action: "job_status_update",
      attempts: 0,
      created_at: "2026-05-07T10:00:00.000Z",
      id: "queue-damaged",
      last_error: null,
      next_retry_at: null,
      outcome: null,
      payload: { job_id: "job-2", status: "teleporting" },
      status: "queued",
      updated_at: "2026-05-07T10:00:00.000Z",
    };

    asyncStorage.values.set(
      QUEUE_KEY,
      JSON.stringify([...storedQueue(), unreadable]),
    );

    await restartApp();

    // The readable half is a working queue item; the unreadable half is kept
    // and marked the way any other terminal failure is.
    expect(useOfflineQueue.getState().items).toEqual([queued]);
    expect(useOfflineQueue.getState().rejected).toEqual([
      {
        action: "job_status_update",
        entry: unreadable,
        id: "queue-damaged",
        last_error: "Job status is invalid",
        outcome: "terminal",
        status: "failed",
      },
    ]);

    // Syncing never offers it to the provider.
    provider.result = { data: { id: "job-1" }, error: null };
    await useQueueSync.getState().syncNow();

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.args.p_job_id).toBe("job-1");

    // It survives a write that has nothing to do with it, rather than being
    // dropped from the device the next time the queue is persisted.
    useOfflineQueue.getState().clearSynced();

    expect(storedQueue()).toEqual([unreadable]);

    expect(
      getOfflineQueueRecoveryItems(
        useOfflineQueue.getState().items,
        useOfflineQueue.getState().rejected,
      ),
    ).toEqual([
      {
        action: "job_status_update",
        id: "queue-damaged",
        label: "Status update for job job-2",
        lastError: "Job status is invalid",
        outcome: "terminal",
      },
    ]);

    useOfflineQueue.getState().discard("queue-damaged");

    expect(useOfflineQueue.getState().rejected).toEqual([]);
    expect(storedQueue()).toEqual([]);
  });

  it("does not reach the provider while the device is offline", async () => {
    useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: statusPayload,
    });
    useSyncStatus.setState({ networkStatus: "offline" });

    await useQueueSync.getState().syncNow();

    expect(provider.calls).toEqual([]);
    expect(useSyncStatus.getState().lastError).toBe("Device is offline");
    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({ attempts: 0, status: "queued" }),
    ]);
  });
});
