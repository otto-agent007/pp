import type {
  CustomerPortalMedia,
  JobMedia,
  JobMediaInput,
  JobMediaType,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
} from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

type MediaClient = SupabaseProviderClient;
type JobMediaRow = JobMedia;

const jobMediaSelect = "*, job:jobs(*, customer:customers(*), location:locations(*))";
const customerPortalMediaSelect =
  "id, job_id, media_type, storage_bucket, storage_path, description, captured_at, job:jobs!inner(id, customer_id, status)";
const signedUrlExpiresInSeconds = 60 * 60;
const jobMediaBucket = "job-media";
const maxPhotoBytes = 10 * 1024 * 1024;
const maxSignatureBytes = 2 * 1024 * 1024;
const descriptionMaxLength = 240;

type MediaKind = "photo" | "signature";

async function getCurrentUserId(client: MediaClient) {
  if (!("auth" in client)) {
    return null;
  }

  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

function toJobMediaRow(input: JobMediaInput, uploadedBy: string | null) {
  return {
    job_id: input.job_id,
    media_type: input.media_type,
    storage_bucket: input.storage_bucket,
    storage_path: input.storage_path,
    description: input.description ?? null,
    uploaded_by: uploadedBy,
    captured_at: input.captured_at ?? null,
  };
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

function sanitizeDescription(value?: string | null) {
  return normalizeOptional(value)?.slice(0, descriptionMaxLength) ?? null;
}

function mediaLabel(kind: MediaKind) {
  return kind === "signature" ? "Signature" : "Photo";
}

function validateMimeType(mimeType: string, kind: MediaKind) {
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

function validateFileSize(bytes: number | null | undefined, kind: MediaKind) {
  if (bytes === null || bytes === undefined) {
    return null;
  }

  if (!Number.isFinite(bytes) || bytes < 0 || !Number.isInteger(bytes)) {
    throw new Error(`${mediaLabel(kind)} file size is invalid`);
  }

  const maxBytes = kind === "signature" ? maxSignatureBytes : maxPhotoBytes;

  if (bytes > maxBytes) {
    throw new Error(`${mediaLabel(kind)} file is too large`);
  }

  return bytes;
}

function validateStoragePath(
  jobId: string,
  storageBucket: string,
  storagePath: string,
  label: string,
) {
  if (storageBucket !== jobMediaBucket) {
    throw new Error(`${label} storage bucket is invalid`);
  }

  const segments = storagePath.split("/");
  const unsafePath =
    storagePath.startsWith("/") ||
    storagePath.startsWith("\\") ||
    storagePath.includes("\\") ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    );

  if (unsafePath || !storagePath.startsWith(`${jobId}/`)) {
    throw new Error(`${label} storage path is invalid`);
  }
}

function validateJobMediaInput(input: JobMediaInput): JobMediaInput {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const storageBucket = requireNonEmpty(input.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(input.storage_path, "Storage path");
  const mediaType: JobMediaType = input.media_type;
  const label = mediaType === "signature" ? "Signature" : "Photo";

  validateStoragePath(jobId, storageBucket, storagePath, label);

  return {
    ...input,
    job_id: jobId,
    media_type: mediaType,
    storage_bucket: storageBucket,
    storage_path: storagePath,
    description: sanitizeDescription(input.description),
    captured_at: normalizeOptional(input.captured_at),
  };
}

function validatePhotoUploadInput(
  input: JobPhotoUploadQueuePayload,
): JobPhotoUploadQueuePayload {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const storageBucket = requireNonEmpty(input.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(input.storage_path, "Storage path");
  const fileSizeBytes = validateFileSize(input.file_size_bytes, "photo");

  validateStoragePath(jobId, storageBucket, storagePath, "Photo");

  return {
    ...input,
    job_id: jobId,
    local_uri: requireNonEmpty(input.local_uri, "Photo"),
    file_name: requireNonEmpty(input.file_name, "Photo file"),
    content_type: validateMimeType(input.content_type, "photo"),
    storage_bucket: storageBucket,
    storage_path: storagePath,
    description: sanitizeDescription(input.description),
    file_size_bytes: fileSizeBytes,
  };
}

function validateSignatureUploadInput(
  input: JobSignatureCaptureQueuePayload,
): JobSignatureCaptureQueuePayload {
  const jobId = requireNonEmpty(input.job_id, "Job");
  const storageBucket = requireNonEmpty(input.storage_bucket, "Storage bucket");
  const storagePath = requireNonEmpty(input.storage_path, "Storage path");
  const fileSizeBytes = validateFileSize(input.file_size_bytes, "signature");

  validateStoragePath(jobId, storageBucket, storagePath, "Signature");

  return {
    ...input,
    job_id: jobId,
    local_uri: requireNonEmpty(input.local_uri, "Signature"),
    file_name: requireNonEmpty(input.file_name, "Signature file"),
    content_type: validateMimeType(input.content_type, "signature"),
    storage_bucket: storageBucket,
    storage_path: storagePath,
    signer_name: normalizeOptional(input.signer_name),
    file_size_bytes: fileSizeBytes,
  };
}

async function readLocalUri(uri: string) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("Unable to read media file");
  }

  return response.blob();
}

function signatureDescription(input: JobSignatureCaptureQueuePayload) {
  const signerName = input.signer_name?.trim();

  return signerName ? `Signed by ${signerName}` : "Customer signature";
}

async function withSignedUrls(records: JobMedia[], client: MediaClient) {
  const withUrls = await Promise.all(
    records.map(async (record) => {
      const { data, error } = await client.storage
        .from(record.storage_bucket)
        .createSignedUrl(record.storage_path, signedUrlExpiresInSeconds);

      if (error) {
        return {
          ...record,
          signed_url: null,
        };
      }

      return {
        ...record,
        signed_url: data.signedUrl,
      };
    }),
  );

  return withUrls;
}

async function withCustomerPortalSignedUrls(
  records: Array<
    CustomerPortalMedia & { storage_bucket: string; storage_path: string }
  >,
  client: MediaClient,
) {
  const withUrls = await Promise.all(
    records.map(async (record) => {
      const { data, error } = await client.storage
        .from(record.storage_bucket)
        .createSignedUrl(record.storage_path, signedUrlExpiresInSeconds);

      return {
        id: record.id,
        job_id: record.job_id,
        media_type: record.media_type,
        description: record.description,
        captured_at: record.captured_at,
        signed_url: error ? null : data.signedUrl,
      } satisfies CustomerPortalMedia;
    }),
  );

  return withUrls;
}

export async function listJobMediaRecords(
  jobId: string,
  client: MediaClient,
) {
  const { data, error } = await client
    .from("job_media")
    .select(jobMediaSelect)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return withSignedUrls((data ?? []) as JobMedia[], client);
}

export async function listCustomerPortalMediaRecords(
  customerId: string,
  client: MediaClient,
) {
  const { data, error } = await client
    .from("job_media")
    .select(customerPortalMediaSelect)
    .eq("job.customer_id", customerId)
    .eq("job.status", "completed")
    .order("captured_at", { ascending: false });

  if (error) {
    throw error;
  }

  return withCustomerPortalSignedUrls(
    (data ?? []) as Array<
      CustomerPortalMedia & { storage_bucket: string; storage_path: string }
    >,
    client,
  );
}

export async function createJobMediaRecord(
  input: JobMediaInput,
  client: MediaClient,
) {
  const validatedInput = validateJobMediaInput(input);
  const uploadedBy = await getCurrentUserId(client);
  const { data, error } = await client
    .from("job_media")
    .insert(toJobMediaRow(validatedInput, uploadedBy))
    .select(jobMediaSelect)
    .single<JobMediaRow>();

  if (error) {
    throw error;
  }

  return data as JobMedia;
}

export async function uploadJobPhotoRecord(
  input: JobPhotoUploadQueuePayload,
  client: MediaClient,
) {
  const validatedInput = validatePhotoUploadInput(input);
  const fileBody = await readLocalUri(validatedInput.local_uri);
  const { error: uploadError } = await client.storage
    .from(validatedInput.storage_bucket)
    .upload(validatedInput.storage_path, fileBody, {
      contentType: validatedInput.content_type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return createJobMediaRecord(
    {
      job_id: validatedInput.job_id,
      media_type: "photo",
      storage_bucket: validatedInput.storage_bucket,
      storage_path: validatedInput.storage_path,
      description: validatedInput.description ?? null,
      captured_at: validatedInput.captured_at ?? null,
    },
    client,
  );
}

export async function uploadJobSignatureRecord(
  input: JobSignatureCaptureQueuePayload,
  client: MediaClient,
) {
  const validatedInput = validateSignatureUploadInput(input);
  const fileBody = await readLocalUri(validatedInput.local_uri);
  const { error: uploadError } = await client.storage
    .from(validatedInput.storage_bucket)
    .upload(validatedInput.storage_path, fileBody, {
      contentType: validatedInput.content_type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return createJobMediaRecord(
    {
      job_id: validatedInput.job_id,
      media_type: "signature",
      storage_bucket: validatedInput.storage_bucket,
      storage_path: validatedInput.storage_path,
      description: signatureDescription(validatedInput),
      captured_at: validatedInput.captured_at ?? null,
    },
    client,
  );
}
