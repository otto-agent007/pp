import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobSignatures } from "./useJobSignatures";
import { useOfflineQueue } from "./useOfflineQueue";

const asyncStorage = vi.hoisted(() => ({
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorage,
}));

const now = "2026-05-05T21:30:00.000Z";

describe("useJobSignatures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useJobSignatures.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
    asyncStorage.removeItem.mockReset();
    asyncStorage.getItem.mockReset();
    asyncStorage.setItem.mockReset();
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

  it("rejects oversized signatures before enqueueing", () => {
    expect(() =>
      useJobSignatures.getState().queueSignature({
        jobId: "job-1",
        localUri: "data:image/png;base64,signature",
        fileSizeBytes: 2 * 1024 * 1024 + 1,
      }),
    ).toThrow("Signature file is too large");

    expect(useOfflineQueue.getState().items).toEqual([]);
  });

  it("trims signer names and carries file size in queued signature payloads", () => {
    useJobSignatures.getState().setSignerName("job-1", "  Jamie Customer  ");

    const payload = useJobSignatures.getState().queueSignature({
      jobId: "job-1",
      localUri: "data:image/png;base64,signature",
      fileSizeBytes: 2048,
    });

    expect(payload).toMatchObject({
      file_size_bytes: 2048,
      signer_name: "Jamie Customer",
    });
    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      action: "signature_capture",
      payload,
      status: "queued",
    });
  });

  it("persists signature drafts and hydrates them after restart", async () => {
    useJobSignatures.getState().setSignerName("job-1", "Jamie Customer");
    const storedDrafts = useJobSignatures.getState().drafts;

    expect(asyncStorage.setItem).toHaveBeenLastCalledWith(
      "pest-patrol:job-signature-drafts:v1",
      JSON.stringify(storedDrafts),
    );

    useJobSignatures.setState({ drafts: {} });
    asyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedDrafts));

    await useJobSignatures.getState().hydrate();

    expect(useJobSignatures.getState().drafts).toEqual(storedDrafts);
  });
});
