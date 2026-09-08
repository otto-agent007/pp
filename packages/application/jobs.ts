import {
  cancelJobRecord,
  createJobRecord,
  listAssignedTechnicianJobRecords,
  listCustomerPortalJobRecords,
  listJobRecords,
  listTechnicianProfileRecords,
  updateJobRecord,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
import type { Job, JobInput, JobStatus } from "@pest-patrol/types";
import {
  jobToInput,
  normalizeOptional,
  requireNonEmpty,
  validateJobInput,
} from "@pest-patrol/domain";

export async function changeJobStatus(job: Job, status: JobStatus) {
  return updateJobRecord(job.id, jobToInput(job, { status }));
}

export async function assignJobTechnician(
  job: Job,
  assignedTechId?: string | null,
) {
  return updateJobRecord(
    job.id,
    jobToInput(job, { assigned_tech_id: normalizeOptional(assignedTechId) }),
  );
}

export async function listJobs() {
  return listJobRecords();
}

export async function listAssignedTechnicianJobs(client: AuthSupabaseClient) {
  return listAssignedTechnicianJobRecords(client);
}

export async function listCustomerPortalJobs(customerId: string) {
  return listCustomerPortalJobRecords(requireNonEmpty(customerId, "Customer"));
}

export async function createJob(input: JobInput) {
  return createJobRecord(validateJobInput(input));
}

export async function updateJob(id: string, input: JobInput) {
  return updateJobRecord(id, validateJobInput(input));
}

export async function cancelJob(id: string) {
  return cancelJobRecord(id);
}

export async function listTechnicians() {
  return listTechnicianProfileRecords("active");
}
