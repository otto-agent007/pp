import type { FormsPort } from "./ports";
import type { FormTemplate, JobFormSubmissionInput } from "@pest-patrol/types";
import {
  requireNonEmpty,
  validateFormSubmissionInput,
} from "@pest-patrol/domain";

export async function listActiveFormTemplates(port: FormsPort) {
  return port.listActiveFormTemplateRecords();
}

export async function listJobFormSubmissions(port: FormsPort, jobId: string) {
  return port.listJobFormSubmissionRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalFormSubmissions(port: FormsPort, customerId: string) {
  return port.listCustomerPortalFormSubmissionRecords(
    requireNonEmpty(customerId, "Customer"),
  );
}

export async function createJobFormSubmission(
  port: FormsPort, input: JobFormSubmissionInput,
  template: FormTemplate,
) {
  return port.createJobFormSubmissionRecord(
    validateFormSubmissionInput(input, template),
  );
}
