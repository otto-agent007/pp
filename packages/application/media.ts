import { requireNonEmpty } from "@pest-patrol/domain";

export async function listJobMedia(jobId: string) {
  const { listJobMediaRecords } = await import("@pest-patrol/api-client");
  return listJobMediaRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalMedia(customerId: string) {
  const { listCustomerPortalMediaRecords } = await import(
    "@pest-patrol/api-client"
  );
  return listCustomerPortalMediaRecords(requireNonEmpty(customerId, "Customer"));
}
