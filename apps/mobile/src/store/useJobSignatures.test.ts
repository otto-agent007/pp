import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobSignatures } from "./useJobSignatures";
import { useOfflineQueue } from "./useOfflineQueue";

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStore);

const now = "2026-05-05T21:30:00.000Z";

describe("useJobSignatures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useJobSignatures.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
    secureStore.deleteItemAsync.mockReset();
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
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

  it("persists signature drafts and hydrates them after restart", async () => {
    useJobSignatures.getState().setSignerName("job-1", "Jamie Customer");
    const storedDrafts = useJobSignatures.getState().drafts;

    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      "pest-patrol:job-signature-drafts:v1",
      JSON.stringify(storedDrafts),
    );

    useJobSignatures.setState({ drafts: {} });
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(storedDrafts));

    await useJobSignatures.getState().hydrate();

    expect(useJobSignatures.getState().drafts).toEqual(storedDrafts);
  });
});
