import type {
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
} from "@pest-patrol/types";
import {
  listCustomerPortalMediaRecords,
  listJobMediaRecords,
} from "@pest-patrol/api-client";

export const JOB_MEDIA_BUCKET = "job-media";

interface PhotoQueueInput {
  captured_at?: string | null;
  content_type?: string | null;
  description?: string | null;
  file_name?: string | null;
  job_id: string;
  local_uri: string;
  now?: string;
}

interface SignatureQueueInput {
  captured_at?: string | null;
  job_id: string;
  local_uri: string;
  now?: string;
  signer_name?: string | null;
}

function timestamp(value?: string | null) {
  return value ?? new Date().toISOString();
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeFileName(value?: string | null) {
  const fallback = "photo.jpg";
  const fileName = normalizeOptional(value) ?? fallback;
  const cleaned = fileName
    .replace(/^.*[\\/]/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  return cleaned || fallback;
}

function inferContentType(fileName: string, contentType?: string | null) {
  const normalized = normalizeOptional(contentType);

  if (normalized) {
    return normalized;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

function validateJobMediaPath(
  jobId: string,
  storageBucket: string,
  storagePath: string,
  mediaLabel: string,
) {
  if (storageBucket !== JOB_MEDIA_BUCKET) {
    throw new Error(`${mediaLabel} storage bucket is invalid`);
  }

  if (!storagePath.startsWith(`${jobId}/`)) {
    throw new Error(`${mediaLabel} storage path is invalid`);
  }
}

export function buildJobPhotoStoragePath(
  jobId: string,
  fileName: string,
  capturedAt?: string | null,
) {
  const cleanJobId = requireNonEmpty(jobId, "Job");
  const cleanFileName = safeFileName(fileName);
  const prefix = timestamp(capturedAt)
    .replace(/[^0-9a-zA-Z]/g, "")
    .slice(0, 15);

  return `${cleanJobId}/${prefix}-${cleanFileName}`;
}

export function buildJobSignatureStoragePath(
  jobId: string,
  capturedAt?: string | null,
) {
  const cleanJobId = requireNonEmpty(jobId, "Job");
  const prefix = timestamp(capturedAt)
    .replace(/[^0-9a-zA-Z]/g, "")
    .slice(0, 15);

  return `${cleanJobId}/${prefix}-signature.png`;
}

export function createJobPhotoUploadQueuePayload(
  input: PhotoQueueInput,
): JobPhotoUploadQueuePayload {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const localUri = requireNonEmpty(input.local_uri, "Photo");
  const fileName = safeFileName(input.file_name ?? localUri);
  const capturedAt = timestamp(input.captured_at ?? input.now);

  return {
    job_id: jobId,
    local_uri: localUri,
    file_name: fileName,
    content_type: inferContentType(fileName, input.content_type),
    storage_bucket: JOB_MEDIA_BUCKET,
    storage_path: buildJobPhotoStoragePath(jobId, fileName, capturedAt),
    description: normalizeOptional(input.description),
    captured_at: capturedAt,
  };
}

export function validateJobPhotoUploadQueuePayload(
  payload: JobPhotoUploadQueuePayload,
): JobPhotoUploadQueuePayload {
  const jobId = requireNonEmpty(payload.job_id, "Job");
  const storageBucket = requireNonEmpty(payload.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(payload.storage_path, "Storage path");

  validateJobMediaPath(jobId, storageBucket, storagePath, "Photo");

  return {
    job_id: jobId,
    local_uri: requireNonEmpty(payload.local_uri, "Photo"),
    file_name: safeFileName(payload.file_name),
    content_type: requireNonEmpty(payload.content_type, "Photo content type"),
    storage_bucket: storageBucket,
    storage_path: storagePath,
    description: normalizeOptional(payload.description),
    captured_at: normalizeOptional(payload.captured_at),
  };
}

export function createJobSignatureCaptureQueuePayload(
  input: SignatureQueueInput,
): JobSignatureCaptureQueuePayload {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const localUri = requireNonEmpty(input.local_uri, "Signature");
  const capturedAt = timestamp(input.captured_at ?? input.now);

  return {
    job_id: jobId,
    local_uri: localUri,
    file_name: "signature.png",
    content_type: "image/png",
    storage_bucket: JOB_MEDIA_BUCKET,
    storage_path: buildJobSignatureStoragePath(jobId, capturedAt),
    signer_name: normalizeOptional(input.signer_name),
    captured_at: capturedAt,
  };
}

export function validateJobSignatureCaptureQueuePayload(
  payload: JobSignatureCaptureQueuePayload,
): JobSignatureCaptureQueuePayload {
  const jobId = requireNonEmpty(payload.job_id, "Job");
  const storageBucket = requireNonEmpty(payload.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(payload.storage_path, "Storage path");
  const contentType = requireNonEmpty(
    payload.content_type,
    "Signature content type",
  );

  validateJobMediaPath(jobId, storageBucket, storagePath, "Signature");

  if (contentType !== "image/png") {
    throw new Error("Signature content type is invalid");
  }

  return {
    job_id: jobId,
    local_uri: requireNonEmpty(payload.local_uri, "Signature"),
    file_name: safeFileName(payload.file_name ?? "signature.png"),
    content_type: contentType,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    signer_name: normalizeOptional(payload.signer_name),
    captured_at: normalizeOptional(payload.captured_at),
  };
}

export async function listJobMedia(jobId: string) {
  return listJobMediaRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalMedia(customerId: string) {
  return listCustomerPortalMediaRecords(requireNonEmpty(customerId, "Customer"));
}
