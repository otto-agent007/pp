import type { MediaPort } from "./ports";
import { requireNonEmpty } from "@pest-patrol/domain";

export async function listJobMedia(port: MediaPort, jobId: string) {
  return port.listJobMediaRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalMedia(port: MediaPort, customerId: string) {
  return port.listCustomerPortalMediaRecords(requireNonEmpty(customerId, "Customer"));
}
