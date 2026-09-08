import type {
  JobMediaInput,
  JobMediaType,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
} from "@pest-patrol/types";

export const JOB_MEDIA_BUCKET = "job-media";

export const JOB_MEDIA_MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const JOB_MEDIA_MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

export const JOB_MEDIA_DESCRIPTION_MAX_LENGTH = 240;

type JobMediaKind = "photo" | "signature";

interface PhotoQueueInput {
  captured_at?: string | null;
  content_type?: string | null;
  description?: string | null;
  file_size_bytes?: number | null;
  file_name?: string | null;
  job_id: string;
  local_uri: string;
  now?: string;
}

interface SignatureQueueInput {
  captured_at?: string | null;
  file_size_bytes?: number | null;
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

export function sanitizeMediaDescription(value?: string | null) {
  const normalized = normalizeOptional(value);
  return normalized
    ? normalized.slice(0, JOB_MEDIA_DESCRIPTION_MAX_LENGTH)
    : null;
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
    return normalized.toLowerCase();
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

function mediaLabel(kind: JobMediaKind) {
  return kind === "signature" ? "Signature" : "Photo";
}

export function validateMediaMimeType(
  mimeType: string,
  kind: JobMediaKind,
) {
  const normalized = requireNonEmpty(mimeType, `${mediaLabel(kind)} content type`)
    .toLowerCase();
  const allowed =
    kind === "signature"
      ? new Set(["image/png"])
      : new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!allowed.has(normalized)) {
    throw new Error(`${mediaLabel(kind)} content type is invalid`);
  }

  return normalized;
}

export function validateMediaFileSize(
  bytes: number | null | undefined,
  kind: JobMediaKind,
) {
  if (bytes === null || bytes === undefined) {
    return null;
  }

  if (!Number.isFinite(bytes) || bytes < 0 || !Number.isInteger(bytes)) {
    throw new Error(`${mediaLabel(kind)} file size is invalid`);
  }

  const maxBytes =
    kind === "signature"
      ? JOB_MEDIA_MAX_SIGNATURE_BYTES
      : JOB_MEDIA_MAX_PHOTO_BYTES;

  if (bytes > maxBytes) {
    throw new Error(`${mediaLabel(kind)} file is too large`);
  }

  return bytes;
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

  const segments = storagePath.split("/");
  const unsafePath =
    storagePath.startsWith("/") ||
    storagePath.startsWith("\\") ||
    storagePath.includes("\\") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..");

  if (unsafePath || !storagePath.startsWith(`${jobId}/`)) {
    throw new Error(`${mediaLabel} storage path is invalid`);
  }
}

function withOptionalFileSize<T extends Record<string, unknown>>(
  payload: T,
  fileSizeBytes: number | null,
) {
  return fileSizeBytes === null
    ? payload
    : {
        ...payload,
        file_size_bytes: fileSizeBytes,
      };
}

export function validateJobMediaInput(input: JobMediaInput): JobMediaInput {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const storageBucket = requireNonEmpty(input.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(input.storage_path, "Storage path");
  const mediaType: JobMediaType = input.media_type;
  const label = mediaType === "signature" ? "Signature" : "Photo";

  validateJobMediaPath(jobId, storageBucket, storagePath, label);

  return {
    ...input,
    job_id: jobId,
    media_type: mediaType,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    description: sanitizeMediaDescription(input.description),
    captured_at: normalizeOptional(input.captured_at),
  };
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
  const contentType = validateMediaMimeType(
    inferContentType(fileName, input.content_type),
    "photo",
  );
  const fileSizeBytes = validateMediaFileSize(input.file_size_bytes, "photo");

  return withOptionalFileSize({
    job_id: jobId,
    local_uri: localUri,
    file_name: fileName,
    content_type: contentType,
    storage_bucket: JOB_MEDIA_BUCKET,
    storage_path: buildJobPhotoStoragePath(jobId, fileName, capturedAt),
    description: sanitizeMediaDescription(input.description),
    captured_at: capturedAt,
  }, fileSizeBytes) as JobPhotoUploadQueuePayload;
}

export function validateJobPhotoUploadQueuePayload(
  payload: JobPhotoUploadQueuePayload,
): JobPhotoUploadQueuePayload {
  const jobId = requireNonEmpty(payload.job_id, "Job");
  const storageBucket = requireNonEmpty(payload.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(payload.storage_path, "Storage path");
  const contentType = validateMediaMimeType(payload.content_type, "photo");
  const fileSizeBytes = validateMediaFileSize(
    payload.file_size_bytes,
    "photo",
  );

  validateJobMediaPath(jobId, storageBucket, storagePath, "Photo");

  return withOptionalFileSize({
    job_id: jobId,
    local_uri: requireNonEmpty(payload.local_uri, "Photo"),
    file_name: safeFileName(payload.file_name),
    content_type: contentType,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    description: sanitizeMediaDescription(payload.description),
    captured_at: normalizeOptional(payload.captured_at),
  }, fileSizeBytes) as JobPhotoUploadQueuePayload;
}

export function createJobSignatureCaptureQueuePayload(
  input: SignatureQueueInput,
): JobSignatureCaptureQueuePayload {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const localUri = requireNonEmpty(input.local_uri, "Signature");
  const capturedAt = timestamp(input.captured_at ?? input.now);
  const fileSizeBytes = validateMediaFileSize(
    input.file_size_bytes,
    "signature",
  );

  return withOptionalFileSize({
    job_id: jobId,
    local_uri: localUri,
    file_name: "signature.png",
    content_type: "image/png",
    storage_bucket: JOB_MEDIA_BUCKET,
    storage_path: buildJobSignatureStoragePath(jobId, capturedAt),
    signer_name: normalizeOptional(input.signer_name),
    captured_at: capturedAt,
  }, fileSizeBytes) as JobSignatureCaptureQueuePayload;
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
  const fileSizeBytes = validateMediaFileSize(
    payload.file_size_bytes,
    "signature",
  );

  validateJobMediaPath(jobId, storageBucket, storagePath, "Signature");

  const normalizedContentType = validateMediaMimeType(contentType, "signature");

  return withOptionalFileSize({
    job_id: jobId,
    local_uri: requireNonEmpty(payload.local_uri, "Signature"),
    file_name: safeFileName(payload.file_name ?? "signature.png"),
    content_type: normalizedContentType,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    signer_name: normalizeOptional(payload.signer_name),
    captured_at: normalizeOptional(payload.captured_at),
  }, fileSizeBytes) as JobSignatureCaptureQueuePayload;
}
