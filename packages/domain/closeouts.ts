import type {
  ChemicalLog,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenSummary,
  CustomerPortalCloseout,
  CustomerPortalFormSubmission,
  CustomerPortalJob,
  CustomerPortalMedia,
  Job,
  JobCloseoutReview,
  JobFormSubmission,
  JobMedia,
} from "@pest-patrol/types";
import {
  createCustomerPortalAccessTokenRecord,
  listCustomerPortalAccessTokenRecords,
  listCustomerPortalCloseoutRecords,
  revokeCustomerPortalAccessTokenRecord,
  listCustomerPortalBillingRecords,
} from "@pest-patrol/api-client";

export type CloseoutStatusFilter = "completed" | "all";

export interface CloseoutCounts {
  chemicalLogs: number;
  forms: number;
  photos: number;
  signatures: number;
}

function searchableJobText(job: Job) {
  return [
    job.customer?.name,
    job.location?.address,
    job.service_notes,
    job.status,
    job.assigned_technician?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterCloseoutJobs(
  jobs: Job[],
  search: string,
  status: CloseoutStatusFilter = "completed",
) {
  const query = search.trim().toLowerCase();

  return jobs
    .filter((job) => status === "all" || job.status === "completed")
    .filter((job) => !query || searchableJobText(job).includes(query))
    .sort(
      (left, right) =>
        Date.parse(right.scheduled_start) - Date.parse(left.scheduled_start),
    );
}

export function buildJobCloseoutReview(input: {
  chemicalLogs: ChemicalLog[];
  formSubmissions: JobFormSubmission[];
  job: Job;
  media: JobMedia[];
}): JobCloseoutReview {
  const photos = input.media.filter((item) => item.media_type === "photo");
  const signatures = input.media.filter((item) => item.media_type === "signature");

  return {
    job: input.job,
    form_submissions: input.formSubmissions,
    chemical_logs: input.chemicalLogs,
    media: input.media,
    photos,
    signatures,
  };
}

export function getCloseoutCounts(review: JobCloseoutReview): CloseoutCounts {
  return {
    chemicalLogs: review.chemical_logs.length,
    forms: review.form_submissions.length,
    photos: review.photos.length,
    signatures: review.signatures.length,
  };
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function portalJobText(closeout: CustomerPortalCloseout) {
  return [
    closeout.job.customer?.name,
    closeout.job.location?.address,
    closeout.job.location?.nickname,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function validateCustomerPortalCustomerId(customerId: string) {
  return requireNonEmpty(customerId, "Customer");
}

export function validateCustomerPortalAccessToken(accessToken: string) {
  return requireNonEmpty(accessToken, "Portal access token");
}

export function validateCustomerPortalAccessTokenId(id: string) {
  return requireNonEmpty(id, "Portal access token");
}

export function validateCustomerPortalAccessInput(
  input: CustomerPortalAccessInput,
) {
  return {
    customer_id: validateCustomerPortalCustomerId(input.customer_id),
    expires_at: input.expires_at?.trim() || null,
  };
}

export async function listCustomerPortalCloseouts(
  customerId: string,
  accessToken: string,
) {
  return listCustomerPortalCloseoutRecords(
    validateCustomerPortalCustomerId(customerId),
    validateCustomerPortalAccessToken(accessToken),
  );
}

export async function listCustomerPortalBilling(
  customerId: string,
  accessToken: string,
) {
  return listCustomerPortalBillingRecords(
    validateCustomerPortalCustomerId(customerId),
    validateCustomerPortalAccessToken(accessToken),
  );
}

export function getCustomerPortalAccessTokenState(
  token: CustomerPortalAccessTokenSummary,
  now = new Date(),
) {
  if (token.status === "revoked") {
    return "revoked";
  }

  if (token.expires_at && Date.parse(token.expires_at) <= now.getTime()) {
    return "expired";
  }

  return "active";
}

export function getCustomerPortalAccessTokenLabel(
  token: CustomerPortalAccessTokenSummary,
  now = new Date(),
) {
  const state = getCustomerPortalAccessTokenState(token, now);

  if (state === "active") {
    return token.expires_at ? "Active until expiration" : "Active";
  }

  if (state === "expired") {
    return "Expired";
  }

  return "Revoked";
}

export async function listCustomerPortalAccessTokens(customerId: string) {
  return listCustomerPortalAccessTokenRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function createCustomerPortalAccessToken(
  input: CustomerPortalAccessInput,
) {
  return createCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessInput(input),
  );
}

export async function revokeCustomerPortalAccessToken(id: string) {
  return revokeCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessTokenId(id),
  );
}

export function buildCustomerPortalCloseouts(input: {
  formSubmissions: CustomerPortalFormSubmission[];
  jobs: CustomerPortalJob[];
  media: CustomerPortalMedia[];
}): CustomerPortalCloseout[] {
  const completedJobs = input.jobs.filter((job) => job.status === "completed");

  return completedJobs.map((job) => {
    const jobForms = input.formSubmissions.filter(
      (submission) => submission.job_id === job.id,
    );
    const jobMedia = input.media.filter((media) => media.job_id === job.id);

    return {
      job,
      form_submissions: jobForms,
      photos: jobMedia.filter((media) => media.media_type === "photo"),
      signatures: jobMedia.filter((media) => media.media_type === "signature"),
    };
  });
}

export function filterCustomerPortalCloseouts(
  closeouts: CustomerPortalCloseout[],
  search: string,
) {
  const query = search.trim().toLowerCase();

  return closeouts.filter(
    (closeout) => !query || portalJobText(closeout).includes(query),
  );
}
