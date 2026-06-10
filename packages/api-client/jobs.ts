import type {
  CustomerPortalJob,
  EstimateConversionInput,
  EstimateConversionResult,
  Job,
  JobBillingDisposition,
  JobInput,
  JobStatus,
  ServiceBillingOfferingId,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";
import { listTechnicianProfileRecords } from "./technicians";

type JobsClient = typeof supabase | AuthSupabaseClient;
type JobRow = Partial<Job> & Pick<
  Job,
  | "assigned_tech_id"
  | "created_at"
  | "customer_id"
  | "id"
  | "location_id"
  | "scheduled_end"
  | "scheduled_start"
  | "service_notes"
  | "status"
  | "updated_at"
>;

function toJobRow(input: JobInput) {
  return {
    customer_id: input.customer_id,
    location_id: input.location_id,
    assigned_tech_id: input.assigned_tech_id ?? null,
    scheduled_start: input.scheduled_start,
    scheduled_end: input.scheduled_end ?? null,
    status: input.status ?? "scheduled",
    service_notes: input.service_notes ?? null,
    job_purpose: input.job_purpose,
    service_offering_id: input.service_offering_id,
    service_family: input.service_family,
    billing_disposition: input.billing_disposition,
    service_cadence: input.service_cadence,
    estimate_status: input.estimate_status,
    parent_job_id: input.parent_job_id,
  };
}

function toJob(row: JobRow): Job {
  return {
    ...row,
    billing_disposition: row.billing_disposition ?? "billable",
    estimate_status: row.estimate_status ?? "not_applicable",
    job_purpose: row.job_purpose ?? "service",
    parent_job: row.parent_job ?? null,
    parent_job_id: row.parent_job_id ?? null,
    service_cadence: row.service_cadence ?? "one_time",
    service_family: row.service_family ?? null,
    service_offering_id: row.service_offering_id ?? null,
  } as Job;
}

function toJobs(rows: JobRow[] | null) {
  return (rows ?? []).map(toJob);
}

const jobSelect =
  "*, customer:customers(*), location:locations(*), assigned_technician:profiles(*)";
const customerPortalJobSelect =
  "id, customer_id, location_id, status, scheduled_start, scheduled_end, customer:customers(id, name), location:locations(id, address, nickname)";

const projectOfferings = new Set<ServiceBillingOfferingId>([
  "rodent_exclusion",
  "bird_exclusion",
  "attic_cleanup_sanitation",
  "insulation_removal",
  "re_insulation",
  "termite_repair",
]);

const estimateToWorkOrderOffering: Partial<
  Record<ServiceBillingOfferingId, ServiceBillingOfferingId>
> = {
  bird_removal: "bird_exclusion",
  rodent_inspection: "rodent_exclusion",
  termite_inspection: "termite_repair",
  wdo_escrow_inspection: "termite_repair",
};

function isEstimateLike(job: Job) {
  return (
    job.job_purpose === "estimate" ||
    job.billing_disposition === "estimate_only"
  );
}

function defaultWorkOrderOffering(job: Job): ServiceBillingOfferingId {
  const current = job.service_offering_id ?? "general_pest_initial";

  return estimateToWorkOrderOffering[current] ?? current;
}

function familyForOffering(
  offeringId: ServiceBillingOfferingId,
): Job["service_family"] {
  if (
    offeringId === "rodent_exclusion" ||
    offeringId === "attic_cleanup_sanitation" ||
    offeringId === "insulation_removal" ||
    offeringId === "re_insulation"
  ) {
    return "rodent_attic";
  }

  if (offeringId === "bird_exclusion") {
    return "bird_gopher";
  }

  if (
    offeringId === "termite_repair" ||
    offeringId === "termite_inspection" ||
    offeringId === "wdo_escrow_inspection" ||
    offeringId === "termite_localized_treatment" ||
    offeringId === "termite_fumigation" ||
    offeringId === "escrow_clearance_document"
  ) {
    return "termite_wdo";
  }

  return "general_pest";
}

function workOrderBillingDisposition(
  offeringId: ServiceBillingOfferingId,
  override?: JobBillingDisposition | null,
): JobBillingDisposition {
  if (override && override !== "estimate_only") {
    return override;
  }

  return projectOfferings.has(offeringId) ? "billable" : "billable";
}

function buildWorkOrderRowFromEstimate(
  estimateJob: Job,
  input: EstimateConversionInput,
): JobInput {
  const offeringId =
    input.service_offering_id ?? defaultWorkOrderOffering(estimateJob);
  const isProject = projectOfferings.has(offeringId);

  return {
    assigned_tech_id: input.assigned_tech_id ?? null,
    billing_disposition: workOrderBillingDisposition(
      offeringId,
      input.billing_disposition,
    ),
    customer_id: estimateJob.customer_id,
    estimate_status: "not_applicable",
    job_purpose: isProject ? "project_phase" : "service",
    location_id: estimateJob.location_id,
    parent_job_id: estimateJob.id,
    scheduled_end: input.scheduled_end ?? null,
    scheduled_start: input.scheduled_start,
    service_cadence: isProject ? "project" : "one_time",
    service_family: familyForOffering(offeringId),
    service_notes: input.service_notes ?? estimateJob.service_notes ?? null,
    service_offering_id: offeringId,
    status: "scheduled",
  };
}

export async function listJobRecords(client: JobsClient = supabase) {
  const { data, error } = await client
    .from("jobs")
    .select(jobSelect)
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw error;
  }

  return toJobs(data as JobRow[] | null);
}

export async function listAssignedTechnicianJobRecords(client: AuthSupabaseClient) {
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error("Technician session is required");
  }

  const { data, error } = await client
    .from("jobs")
    .select(jobSelect)
    .eq("assigned_tech_id", userData.user.id)
    .order("scheduled_start", { ascending: true });

  if (error) {
    throw error;
  }

  return toJobs(data as JobRow[] | null);
}

export async function listCustomerPortalJobRecords(
  customerId: string,
  client: JobsClient = supabase,
) {
  const { data, error } = await client
    .from("jobs")
    .select(customerPortalJobSelect)
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .order("scheduled_start", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CustomerPortalJob[];
}

export async function createJobRecord(input: JobInput) {
  const { data, error } = await supabase
    .from("jobs")
    .insert(toJobRow(input))
    .select(jobSelect)
    .single<JobRow>();

  if (error) {
    throw error;
  }

  return toJob(data as JobRow);
}

export async function convertEstimateToWorkOrderRecord(
  input: EstimateConversionInput,
  client: JobsClient = supabase,
): Promise<EstimateConversionResult> {
  const { data: estimateData, error: estimateError } = await client
    .from("jobs")
    .select(jobSelect)
    .eq("id", input.estimate_job_id)
    .single<JobRow>();

  if (estimateError) {
    throw estimateError;
  }

  if (!estimateData) {
    throw new Error("Estimate job was not found");
  }

  const estimateJob = toJob(estimateData as JobRow);

  if (!isEstimateLike(estimateJob)) {
    throw new Error("Only estimate jobs can be converted to work orders");
  }

  if (estimateJob.status === "canceled") {
    throw new Error("Canceled estimates cannot be converted");
  }

  if (estimateJob.estimate_status === "declined") {
    throw new Error("Declined estimates cannot be converted");
  }

  const { data: existingData, error: existingError } = await client
    .from("jobs")
    .select(jobSelect)
    .eq("parent_job_id", estimateJob.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<JobRow>();

  if (existingError) {
    throw existingError;
  }

  if (existingData) {
    return {
      estimate_job: estimateJob,
      reused_existing_work_order: true,
      work_order_job: toJob(existingData as JobRow),
    };
  }

  const { data: workOrderData, error: createError } = await client
    .from("jobs")
    .insert(toJobRow(buildWorkOrderRowFromEstimate(estimateJob, input)))
    .select(jobSelect)
    .single<JobRow>();

  if (createError) {
    throw createError;
  }

  const workOrderJob = toJob(workOrderData as JobRow);
  const { data: acceptedEstimateData, error: acceptError } = await client
    .from("jobs")
    .update({ estimate_status: "accepted" })
    .eq("id", estimateJob.id)
    .select(jobSelect)
    .single<JobRow>();

  return {
    estimate_job: acceptError
      ? estimateJob
      : toJob(acceptedEstimateData as JobRow),
    reused_existing_work_order: false,
    warning: acceptError
      ? "Work order was created, but the estimate status could not be updated. Review the source estimate before billing."
      : null,
    work_order_job: workOrderJob,
  };
}

export async function updateJobRecord(id: string, input: JobInput) {
  const { data, error } = await supabase
    .from("jobs")
    .update(toJobRow(input))
    .eq("id", id)
    .select(jobSelect)
    .single<JobRow>();

  if (error) {
    throw error;
  }

  return toJob(data as JobRow);
}

export async function updateAssignedTechnicianJobStatusRecord(
  client: AuthSupabaseClient,
  id: string,
  status: JobStatus,
  previousStatus?: JobStatus,
) {
  if (!previousStatus) {
    throw new Error("Previous job status is required");
  }

  const { data, error } = await client
    .rpc("update_assigned_job_status", {
      p_expected_previous_status: previousStatus,
      p_job_id: id,
      p_next_status: status,
    })
    .select(jobSelect)
    .single<JobRow>();

  if (error) {
    throw error;
  }

  return toJob(data as JobRow);
}

export async function cancelJobRecord(id: string) {
  const { data, error } = await supabase
    .from("jobs")
    .update({ status: "canceled" })
    .eq("id", id)
    .select(jobSelect)
    .single<JobRow>();

  if (error) {
    throw error;
  }

  return toJob(data as JobRow);
}

export async function listTechnicianProfiles() {
  return listTechnicianProfileRecords("active");
}
