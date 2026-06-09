import type {
  CustomerPortalJob,
  Job,
  JobInput,
  JobStatus,
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
