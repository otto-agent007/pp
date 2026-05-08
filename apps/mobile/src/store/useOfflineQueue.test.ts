import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOfflineQueue } from "./useOfflineQueue";

const now = "2026-05-07T17:15:00.000Z";

describe("useOfflineQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useOfflineQueue.setState({ items: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears synced queue items while keeping pending and failed work visible", () => {
    const pending = useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: { job_id: "job-1", status: "en_route" },
    });
    const failed = useOfflineQueue.getState().enqueue({
      action: "photo_upload",
      payload: { job_id: "job-1", local_uri: "file://photo.jpg" },
    });
    const synced = useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload: { job_id: "job-1", local_uri: "data:image/png;base64,signature" },
    });

    useOfflineQueue.getState().markFailed(failed.id, "Upload failed");
    useOfflineQueue.getState().markSynced(synced.id);
    useOfflineQueue.getState().clearSynced();

    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({ id: pending.id, status: "queued" }),
      expect.objectContaining({ id: failed.id, status: "failed" }),
    ]);
  });
});
