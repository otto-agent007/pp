import type { JobsPort } from "./ports";
import type { Job, JobInput, JobStatus } from "@pest-patrol/types";
import {
  jobToInput,
  normalizeOptional,
  requireNonEmpty,
  validateJobInput,
} from "@pest-patrol/domain";

export async function changeJobStatus(port: JobsPort, job: Job, status: JobStatus) {
  return port.updateJobRecord(job.id, jobToInput(job, { status }));
}

export async function assignJobTechnician(
  port: JobsPort, job: Job,
  assignedTechId?: string | null,
) {
  return port.updateJobRecord(
    job.id,
    jobToInput(job, { assigned_tech_id: normalizeOptional(assignedTechId) }),
  );
}

export async function listJobs(port: JobsPort) {
  return port.listJobRecords();
}

export async function listAssignedTechnicianJobs(port: JobsPort) {
  return port.listAssignedTechnicianJobRecords();
}

export async function listCustomerPortalJobs(port: JobsPort, customerId: string) {
  return port.listCustomerPortalJobRecords(requireNonEmpty(customerId, "Customer"));
}

export async function createJob(port: JobsPort, input: JobInput) {
  return port.createJobRecord(validateJobInput(input));
}

export async function updateJob(port: JobsPort, id: string, input: JobInput) {
  return port.updateJobRecord(id, validateJobInput(input));
}

export async function cancelJob(port: JobsPort, id: string) {
  return port.cancelJobRecord(id);
}

export async function listTechnicians(port: JobsPort) {
  return port.listTechnicianProfileRecords("active");
}
