import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobSignatures } from "./useJobSignatures";
import { useOfflineQueue } from "./useOfflineQueue";

const now = "2026-05-05T21:30:00.000Z";

describe("useJobSignatures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useJobSignatures.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues signature captures for offline sync", () => {
    useJobSignatures.getState().setSignerName("job-1", "Jamie Customer");

    const payload = useJobSignatures.getState().queueSignature({
      jobId: "job-1",
      localUri: "data:image/png;base64,signature",
    });

    expect(payload).toEqual(
      expect.objectContaining({
        content_type: "image/png",
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        signer_name: "Jamie Customer",
        storage_bucket: "job-media",
      }),
    );
    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      action: "signature_capture",
      payload,
      status: "queued",
    });
    expect(useJobSignatures.getState().getDraft("job-1")).toMatchObject({
      queuedAt: now,
      signerName: "",
    });
  });

  it("rejects empty signature data before enqueueing", () => {
    expect(() =>
      useJobSignatures.getState().queueSignature({
        jobId: "job-1",
        localUri: " ",
      }),
    ).toThrow("Signature is required");

    expect(useOfflineQueue.getState().items).toEqual([]);
  });
});
