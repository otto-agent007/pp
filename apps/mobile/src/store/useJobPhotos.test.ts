import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobPhotos } from "./useJobPhotos";
import { useOfflineQueue } from "./useOfflineQueue";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStore);

const now = "2026-05-05T21:45:00.000Z";

describe("useJobPhotos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useJobPhotos.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
    secureStore.deleteItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("persists photo drafts and hydrates them after restart", async () => {
    useJobPhotos.getState().setDescription("job-1", "Kitchen baseboards");
    const storedDrafts = useJobPhotos.getState().drafts;

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:job-photo-drafts:v1",
      JSON.stringify(storedDrafts),
    );

    useJobPhotos.setState({ drafts: {} });
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(storedDrafts));

    await useJobPhotos.getState().hydrate();

    expect(useJobPhotos.getState().drafts).toEqual(storedDrafts);
  });

  it("persists queued photo metadata", () => {
    useJobPhotos.getState().setDescription("job-1", "Kitchen baseboards");

    const payload = useJobPhotos.getState().queuePhoto({
      jobId: "job-1",
      localUri: "file://photo.jpg",
    });

    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      action: "photo_upload",
      payload,
    });
    expect(useJobPhotos.getState().getDraft("job-1")).toMatchObject({
      description: "",
      queuedAt: now,
      queuedPhotos: [payload],
    });
    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:job-photo-drafts:v1",
      JSON.stringify(useJobPhotos.getState().drafts),
    );
  });
});
