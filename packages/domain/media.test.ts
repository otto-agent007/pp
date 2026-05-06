import { describe, expect, it } from "vitest";

import {
  buildJobPhotoStoragePath,
  buildJobSignatureStoragePath,
  createJobSignatureCaptureQueuePayload,
  createJobPhotoUploadQueuePayload,
  validateJobSignatureCaptureQueuePayload,
  validateJobPhotoUploadQueuePayload,
} from "./media";

const now = "2026-05-05T20:30:00.000Z";

describe("media domain", () => {
  it("builds stable job photo storage paths", () => {
    expect(buildJobPhotoStoragePath("job-1", "Kitchen Photo!.jpg", now)).toBe(
      "job-1/20260505T203000-Kitchen-Photo-.jpg",
    );
  });

  it("builds stable job signature storage paths", () => {
    expect(buildJobSignatureStoragePath("job-1", now)).toBe(
      "job-1/20260505T203000-signature.png",
    );
  });

  it("creates normalized photo upload queue payloads", () => {
    expect(
      createJobPhotoUploadQueuePayload({
        job_id: " job-1 ",
        local_uri: " file:///photo.png ",
        file_name: " kitchen photo.png ",
        description: "  Under sink ",
        now,
      }),
    ).toEqual({
      job_id: "job-1",
      local_uri: "file:///photo.png",
      file_name: "kitchen-photo.png",
      content_type: "image/png",
      storage_bucket: "job-media",
      storage_path: "job-1/20260505T203000-kitchen-photo.png",
      description: "Under sink",
      captured_at: now,
    });
  });

  it("creates normalized signature capture queue payloads", () => {
    expect(
      createJobSignatureCaptureQueuePayload({
        job_id: " job-1 ",
        local_uri: " data:image/png;base64,signature ",
        signer_name: "  Jamie Customer ",
        now,
      }),
    ).toEqual({
      job_id: "job-1",
      local_uri: "data:image/png;base64,signature",
      file_name: "signature.png",
      content_type: "image/png",
      storage_bucket: "job-media",
      storage_path: "job-1/20260505T203000-signature.png",
      signer_name: "Jamie Customer",
      captured_at: now,
    });
  });

  it("rejects invalid photo storage payloads", () => {
    expect(() =>
      validateJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "wrong",
        storage_path: "job-1/photo.jpg",
      }),
    ).toThrow("Photo storage bucket is invalid");

    expect(() =>
      validateJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "other-job/photo.jpg",
      }),
    ).toThrow("Photo storage path is invalid");
  });

  it("rejects invalid signature storage payloads", () => {
    expect(() =>
      validateJobSignatureCaptureQueuePayload({
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.png",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
      }),
    ).toThrow("Signature content type is invalid");

    expect(() =>
      validateJobSignatureCaptureQueuePayload({
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.png",
        content_type: "image/png",
        storage_bucket: "job-media",
        storage_path: "other-job/signature.png",
      }),
    ).toThrow("Signature storage path is invalid");
  });
});
