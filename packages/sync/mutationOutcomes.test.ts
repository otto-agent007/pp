import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MUTATION_OUTCOME_POLICY,
  MutationFailure,
} from "@pest-patrol/application";
import type { OfflineSyncPort } from "@pest-patrol/application";
import { createOfflineQueueItem } from "@pest-patrol/domain";
import type { OfflineQueueItem } from "@pest-patrol/types";

import { processOfflineQueueItem, processOfflineQueueItems } from "./offlineSync";

/**
 * The queue acting on what a failure meant, which CR19 wired.
 *
 * `durability.test.ts` asks whether an item survives a restart and whether a
 * replay is the same logical write. It treats every failure alike, because
 * until now the queue did: it counted attempts and stringified whatever was
 * thrown. These tests ask the question that replaces the counting — did this
 * attempt fail in a way another attempt could fix — and assert that the answer
 * is recorded where `apps` can read it after a restart.
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

const _portShapeCheck: (
  p: ReturnType<typeof createStubPort>,
) => OfflineSyncPort = (p) => p;
void _portShapeCheck;

beforeEach(() => {
  port = createStubPort();
});

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

function restart<TItem>(items: TItem[]): TItem[] {
  return JSON.parse(JSON.stringify(items)) as TItem[];
}

/** Drive one item to failure, rejecting every attempt with the same reason. */
async function drainAttempts(
  item: OfflineQueueItem,
  error: unknown,
  attempts: number,
) {
  let current = item;

  for (let index = 0; index < attempts; index += 1) {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(error);
    current = await processOfflineQueueItem(port, current, {
      // Far enough ahead that backoff never makes an attempt skip.
      now: `2026-05-06T0${index}:00:00.000Z`,
    });
  }

  return current;
}

describe("the queue acts on what a failure meant", () => {
  it("takes its retry budget from the application policy, not a local default", async () => {
    // This package used to default to three attempts of its own while
    // DEFAULT_MUTATION_OUTCOME_POLICY allowed five, so the budget was declared
    // twice and the two disagreed. Every existing test passes maxAttempts
    // explicitly, which is exactly why the disagreement survived unnoticed.
    const budget = DEFAULT_MUTATION_OUTCOME_POLICY.maxAttempts;

    expect(budget).toBeGreaterThan(3);

    const beforeBudget = await drainAttempts(
      formItem(),
      new MutationFailure("network-unavailable", "Offline"),
      budget - 1,
    );

    expect(beforeBudget.status).toBe("retrying");
    expect(beforeBudget.attempts).toBe(budget - 1);

    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new MutationFailure("network-unavailable", "Offline"),
    );
    const atBudget = await processOfflineQueueItem(port, beforeBudget, {
      now: "2026-05-07T00:00:00.000Z",
    });

    expect(atBudget.status).toBe("failed");
    expect(atBudget.outcome).toBe("terminal");
  });

  it("stops a terminal failure immediately rather than spending the budget", async () => {
    const next = await drainAttempts(
      formItem(),
      new MutationFailure("invalid-intent", "Template no longer exists"),
      1,
    );

    expect(next.status).toBe("failed");
    expect(next.outcome).toBe("terminal");
    // One attempt, not five. The budget exists to stop a retryable failure
    // retrying forever, not to delay a failure that can never succeed.
    expect(next.attempts).toBe(1);
    expect(next.next_retry_at).toBeNull();
    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledTimes(1);
  });

  it("stops a conflict immediately and records it as a conflict", async () => {
    const next = await drainAttempts(
      formItem(),
      new MutationFailure("precondition-conflict", "Transition is not allowed"),
      1,
    );

    expect(next.status).toBe("failed");
    // Distinguished from terminal, because a person can still resolve it and
    // CR09 has to show them something different.
    expect(next.outcome).toBe("conflict");
    expect(next.attempts).toBe(1);
  });

  it("retries an ambiguous response under the intent's existing identity", async () => {
    const item = formItem();

    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new MutationFailure("ambiguous-response", "Gateway timed out"),
    );
    const retrying = await processOfflineQueueItem(port, item, {
      now: "2026-05-05T20:01:00.000Z",
    });

    expect(retrying.status).toBe("retrying");
    expect(retrying.outcome).toBe("ambiguous");
    // The write may already have applied, so a replay has to be the same
    // logical write rather than a second one.
    expect(retrying.id).toBe(item.id);
    expect(retrying.payload).toEqual(item.payload);

    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);
    const synced = await processOfflineQueueItem(port, restart([retrying])[0]!, {
      now: "2026-05-05T20:10:00.000Z",
    });

    expect(synced.id).toBe(item.id);
    expect(synced.status).toBe("synced");
    expect(synced.outcome).toBe("applied");
    expect(port.createJobFormSubmissionRecord).toHaveBeenLastCalledWith(
      item.payload,
    );
  });

  it("keeps an unmapped failure retryable", async () => {
    // An adapter that has not been taught a provider's case throws a bare
    // Error. Treating that as terminal would turn one adapter's omission into
    // lost field work, so it stays retryable.
    const next = await drainAttempts(formItem(), new Error("Who knows"), 1);

    expect(next.status).toBe("retrying");
    expect(next.outcome).toBe("retryable");
  });

  it("records a payload the domain refuses as terminal without an attempt", async () => {
    const malformed = {
      ...formItem("queue-malformed"),
      payload: { job_id: "job-1" },
    } as OfflineQueueItem;

    const result = await processOfflineQueueItems(port, [malformed], {
      now: "2026-05-05T20:01:00.000Z",
    });

    expect(result.items[0]?.status).toBe("failed");
    expect(result.items[0]?.outcome).toBe("terminal");
    expect(result.items[0]?.attempts).toBe(0);
    expect(port.createJobFormSubmissionRecord).not.toHaveBeenCalled();
  });

  it("carries the resolved outcome across a restart", async () => {
    const conflicted = await drainAttempts(
      formItem(),
      new MutationFailure("precondition-conflict", "Transition is not allowed"),
      1,
    );

    // The store persists the items and discards the summary, so an outcome
    // recorded only in the summary would not be here after a relaunch.
    expect(restart([conflicted])[0]?.outcome).toBe("conflict");
  });
});
