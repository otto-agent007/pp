import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOfflineQueue } from "./useOfflineQueue";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStore);

const now = "2026-05-07T17:15:00.000Z";

describe("useOfflineQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useOfflineQueue.setState({ items: [] });
    secureStore.deleteItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
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
      payload: {
        content_type: "image/jpeg",
        file_name: "photo.jpg",
        job_id: "job-1",
        local_uri: "file://photo.jpg",
        storage_bucket: "job-media",
        storage_path: "job-1/photo.jpg",
      },
    });
    const synced = useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload: {
        content_type: "image/png",
        file_name: "signature.png",
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
      },
    });

    useOfflineQueue.getState().markFailed(failed.id, "Upload failed");
    useOfflineQueue.getState().markSynced(synced.id);
    useOfflineQueue.getState().clearSynced();

    expect(useOfflineQueue.getState().items).toEqual([
      expect.objectContaining({ id: pending.id, status: "queued" }),
      expect.objectContaining({ id: failed.id, status: "failed" }),
    ]);
  });

  it("persists queued work and hydrates it after restart", async () => {
    const queued = useOfflineQueue.getState().enqueue({
      action: "job_status_update",
      payload: { job_id: "job-1", status: "en_route" },
    });

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:offline-queue:v1",
      JSON.stringify([queued]),
    );

    useOfflineQueue.setState({ items: [] });
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify([queued]));

    await useOfflineQueue.getState().hydrate();

    expect(useOfflineQueue.getState().items).toEqual([queued]);
  });

  it("persists clearing synced queue items", () => {
    const synced = useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload: {
        content_type: "image/png",
        file_name: "signature.png",
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
      },
    });

    useOfflineQueue.getState().markSynced(synced.id);
    useOfflineQueue.getState().clearSynced();

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:offline-queue:v1",
      JSON.stringify([]),
    );
  });

  it("scrubs sensitive proof payloads before persisting synced history", () => {
    const synced = useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload: {
        content_type: "image/png",
        data_url: "data:image/png;base64,signature",
        file_name: "signature.png",
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        signature_data: "raw-signature",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
      },
    });

    useOfflineQueue.getState().markSynced(synced.id);

    const [persistedKey, persistedValue] =
      secureStore.setItemAsync.mock.calls.at(-1) ?? [];
    expect(persistedKey).toBe("pest-patrol:offline-queue:v1");
    expect(JSON.parse(persistedValue as string)).toEqual([
      expect.objectContaining({
        id: synced.id,
        status: "synced",
        payload: {
          content_type: "image/png",
          file_name: "signature.png",
          job_id: "job-1",
          storage_bucket: "job-media",
          storage_path: "job-1/signature.png",
        },
      }),
    ]);
  });
});
