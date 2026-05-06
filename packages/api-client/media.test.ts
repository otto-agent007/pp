import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJobMediaRecord,
  listCustomerPortalMediaRecords,
  listJobMediaRecords,
  uploadJobPhotoRecord,
  uploadJobSignatureRecord,
} from "./media";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-05T00:00:00Z";
const media = {
  id: "media-1",
  job_id: "job-1",
  media_type: "photo",
  storage_bucket: "job-media",
  storage_path: "job-1/photo.jpg",
  description: null,
  uploaded_by: null,
  captured_at: now,
  created_at: now,
  updated_at: now,
};

describe("media api client", () => {
  const from = vi.mocked(supabase.from);
  const storageFrom = vi.mocked(supabase.storage.from);

  beforeEach(() => {
    from.mockReset();
    storageFrom.mockReset();
    vi.unstubAllGlobals();
  });

  it("lists job media with signed URLs", async () => {
    const query = new MockQuery({ data: [media], error: null });
    storageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/photo.jpg" },
        error: null,
      }),
    } as never);
    from.mockReturnValue(query as never);

    const records = await listJobMediaRecords("job-1");

    expect(records).toHaveLength(1);
    expect(records[0].signed_url).toBe("https://signed.example/photo.jpg");
    expect(from).toHaveBeenCalledWith("job_media");
    expect(storageFrom).toHaveBeenCalledWith("job-media");
    expect(query.calls).toContainEqual(["eq", ["job_id", "job-1"]]);
  });

  it("lists customer portal media with signed URLs for completed customer jobs", async () => {
    const query = new MockQuery({ data: [media], error: null });
    storageFrom.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/photo.jpg" },
        error: null,
      }),
    } as never);
    from.mockReturnValue(query as never);

    const records = await listCustomerPortalMediaRecords("customer-1");

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(
      expect.objectContaining({
        id: "media-1",
        job_id: "job-1",
        signed_url: "https://signed.example/photo.jpg",
      }),
    );
    expect(from).toHaveBeenCalledWith("job_media");
    expect(query.calls).toContainEqual(["eq", ["job.customer_id", "customer-1"]]);
    expect(query.calls).toContainEqual(["eq", ["job.status", "completed"]]);
  });

  it("creates job media metadata", async () => {
    const query = new MockQuery({ data: media, error: null });
    from.mockReturnValue(query as never);

    await createJobMediaRecord({
      job_id: "job-1",
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: "job-1/photo.jpg",
      description: "Kitchen",
      captured_at: now,
    });

    expect(query.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          job_id: "job-1",
          storage_bucket: "job-media",
          storage_path: "job-1/photo.jpg",
          uploaded_by: null,
        }),
      ],
    ]);
  });

  it("uploads a photo then creates metadata with an authenticated client", async () => {
    const query = new MockQuery({ data: media, error: null });
    const storageFrom = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "job-1/photo.jpg" }, error: null }),
    });
    const clientFrom = vi.fn().mockReturnValue(query);
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "technician-1" } },
          error: null,
        }),
      },
      from: clientFrom,
      storage: {
        from: storageFrom,
      },
    } as never;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob(["photo"])),
        ok: true,
      }),
    );

    await uploadJobPhotoRecord(
      {
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "job-1/photo.jpg",
        description: "Kitchen",
        captured_at: now,
      },
      client,
    );

    expect(storageFrom).toHaveBeenCalledWith("job-media");
    expect(clientFrom).toHaveBeenCalledWith("job_media");
    expect(query.calls[0][1][0]).toEqual(
      expect.objectContaining({
        uploaded_by: "technician-1",
        storage_path: "job-1/photo.jpg",
      }),
    );
  });

  it("uploads a signature data URI then creates signature metadata", async () => {
    const signatureMedia = {
      ...media,
      media_type: "signature",
      storage_path: "job-1/signature.png",
      description: "Signed by Jamie Customer",
    };
    const query = new MockQuery({ data: signatureMedia, error: null });
    const upload = vi
      .fn()
      .mockResolvedValue({ data: { path: "job-1/signature.png" }, error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const clientFrom = vi.fn().mockReturnValue(query);
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "technician-1" } },
          error: null,
        }),
      },
      from: clientFrom,
      storage: {
        from: storageFrom,
      },
    } as never;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        blob: vi.fn().mockResolvedValue(new Blob(["signature"])),
        ok: true,
      }),
    );

    await uploadJobSignatureRecord(
      {
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.png",
        content_type: "image/png",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
        signer_name: "Jamie Customer",
        captured_at: now,
      },
      client,
    );

    expect(upload).toHaveBeenCalledWith(
      "job-1/signature.png",
      expect.any(Blob),
      {
        contentType: "image/png",
        upsert: false,
      },
    );
    expect(query.calls[0][1][0]).toEqual(
      expect.objectContaining({
        description: "Signed by Jamie Customer",
        media_type: "signature",
        storage_path: "job-1/signature.png",
      }),
    );
  });
});
