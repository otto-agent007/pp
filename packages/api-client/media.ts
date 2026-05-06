import type {
  CustomerPortalMedia,
  JobMedia,
  JobMediaInput,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type MediaClient = typeof supabase | AuthSupabaseClient;
type JobMediaRow = JobMedia;

const jobMediaSelect = "*, job:jobs(*, customer:customers(*), location:locations(*))";
const customerPortalMediaSelect =
  "id, job_id, media_type, storage_bucket, storage_path, description, captured_at, job:jobs!inner(id, customer_id, status)";
const signedUrlExpiresInSeconds = 60 * 60;

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
  client: MediaClient = supabase,
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
  client: MediaClient = supabase,
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
  client: MediaClient = supabase,
) {
  const uploadedBy = await getCurrentUserId(client);
  const { data, error } = await client
    .from("job_media")
    .insert(toJobMediaRow(input, uploadedBy))
    .select(jobMediaSelect)
    .single<JobMediaRow>();

  if (error) {
    throw error;
  }

  return data as JobMedia;
}

export async function uploadJobPhotoRecord(
  input: JobPhotoUploadQueuePayload,
  client: MediaClient = supabase,
) {
  const fileBody = await readLocalUri(input.local_uri);
  const { error: uploadError } = await client.storage
    .from(input.storage_bucket)
    .upload(input.storage_path, fileBody, {
      contentType: input.content_type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return createJobMediaRecord(
    {
      job_id: input.job_id,
      media_type: "photo",
      storage_bucket: input.storage_bucket,
      storage_path: input.storage_path,
      description: input.description ?? null,
      captured_at: input.captured_at ?? null,
    },
    client,
  );
}

export async function uploadJobSignatureRecord(
  input: JobSignatureCaptureQueuePayload,
  client: MediaClient = supabase,
) {
  const fileBody = await readLocalUri(input.local_uri);
  const { error: uploadError } = await client.storage
    .from(input.storage_bucket)
    .upload(input.storage_path, fileBody, {
      contentType: input.content_type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return createJobMediaRecord(
    {
      job_id: input.job_id,
      media_type: "signature",
      storage_bucket: input.storage_bucket,
      storage_path: input.storage_path,
      description: signatureDescription(input),
      captured_at: input.captured_at ?? null,
    },
    client,
  );
}
