import { describe, expect, it } from "vitest";

import {
  JOB_MEDIA_MAX_PHOTO_BYTES,
  JOB_MEDIA_MAX_SIGNATURE_BYTES,
  buildJobPhotoStoragePath,
  buildJobSignatureStoragePath,
  createJobSignatureCaptureQueuePayload,
  createJobPhotoUploadQueuePayload,
  sanitizeMediaDescription,
  validateMediaFileSize,
  validateMediaMimeType,
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

  it("accepts only customer-safe raster photo MIME types", () => {
    expect(validateMediaMimeType("image/jpeg", "photo")).toBe("image/jpeg");
    expect(validateMediaMimeType("image/png", "photo")).toBe("image/png");
    expect(validateMediaMimeType("image/webp", "photo")).toBe("image/webp");

    for (const mimeType of [
      "image/svg+xml",
      "text/html",
      "application/pdf",
      "application/x-msdownload",
      "application/octet-stream",
    ]) {
      expect(() => validateMediaMimeType(mimeType, "photo")).toThrow(
        "Photo content type is invalid",
      );
    }
  });

  it("enforces photo and signature size limits when byte counts are available", () => {
    expect(validateMediaFileSize(JOB_MEDIA_MAX_PHOTO_BYTES, "photo")).toBe(
      JOB_MEDIA_MAX_PHOTO_BYTES,
    );
    expect(
      validateMediaFileSize(JOB_MEDIA_MAX_SIGNATURE_BYTES, "signature"),
    ).toBe(JOB_MEDIA_MAX_SIGNATURE_BYTES);

    expect(() =>
      validateMediaFileSize(JOB_MEDIA_MAX_PHOTO_BYTES + 1, "photo"),
    ).toThrow("Photo file is too large");
    expect(() =>
      validateMediaFileSize(JOB_MEDIA_MAX_SIGNATURE_BYTES + 1, "signature"),
    ).toThrow("Signature file is too large");
  });

  it("trims and caps media descriptions without treating them as markup", () => {
    const description = sanitizeMediaDescription(
      `  <b>${"safe ".repeat(80)}</b>  `,
    );

    expect(description?.startsWith("<b>safe")).toBe(true);
    expect(description).toHaveLength(240);
    expect(sanitizeMediaDescription("   ")).toBeNull();
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

    expect(() =>
      validateJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.svg",
        file_name: "photo.svg",
        content_type: "image/svg+xml",
        storage_bucket: "job-media",
        storage_path: "job-1/photo.svg",
      }),
    ).toThrow("Photo content type is invalid");

    expect(() =>
      validateJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "/job-1/photo.jpg",
      }),
    ).toThrow("Photo storage path is invalid");

    expect(() =>
      validateJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "job-1/../photo.jpg",
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

    expect(() =>
      validateJobSignatureCaptureQueuePayload({
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.svg",
        content_type: "image/png",
        storage_bucket: "job-media",
        storage_path: "/job-1/signature.png",
      }),
    ).toThrow("Signature storage path is invalid");
  });

  it("preserves queue payload contracts while carrying optional file size", () => {
    expect(
      createJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.webp",
        file_name: "photo.webp",
        content_type: "image/webp",
        file_size_bytes: 1234,
        now,
      }),
    ).toMatchObject({
      content_type: "image/webp",
      file_name: "photo.webp",
      file_size_bytes: 1234,
      job_id: "job-1",
      storage_bucket: "job-media",
      storage_path: "job-1/20260505T203000-photo.webp",
    });
  });
});
