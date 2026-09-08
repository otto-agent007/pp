import {
  createJobFormSubmissionRecord,
  listActiveFormTemplateRecords,
  listCustomerPortalFormSubmissionRecords,
  listJobFormSubmissionRecords,
} from "@pest-patrol/api-client";
import type { FormTemplate, JobFormSubmissionInput } from "@pest-patrol/types";
import {
  requireNonEmpty,
  validateFormSubmissionInput,
} from "@pest-patrol/domain";

export async function listActiveFormTemplates() {
  return listActiveFormTemplateRecords();
}

export async function listJobFormSubmissions(jobId: string) {
  return listJobFormSubmissionRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalFormSubmissions(customerId: string) {
  return listCustomerPortalFormSubmissionRecords(
    requireNonEmpty(customerId, "Customer"),
  );
}

export async function createJobFormSubmission(
  input: JobFormSubmissionInput,
  template: FormTemplate,
) {
  return createJobFormSubmissionRecord(
    validateFormSubmissionInput(input, template),
  );
}
