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
type JobRow = Job;

function toJobRow(input: JobInput) {
  return {
    customer_id: input.customer_id,
    location_id: input.location_id,
    assigned_tech_id: input.assigned_tech_id ?? null,
    scheduled_start: input.scheduled_start,
    scheduled_end: input.scheduled_end ?? null,
    status: input.status ?? "scheduled",
    service_notes: input.service_notes ?? null,
  };
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

  return (data ?? []) as Job[];
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

  return (data ?? []) as Job[];
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

  return data as Job;
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

  return data as Job;
}

export async function updateAssignedTechnicianJobStatusRecord(
  client: AuthSupabaseClient,
  id: string,
  status: JobStatus,
) {
  const { data, error } = await client
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .select(jobSelect)
    .single<JobRow>();

  if (error) {
    throw error;
  }

  return data as Job;
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

  return data as Job;
}

export async function listTechnicianProfiles() {
  return listTechnicianProfileRecords("active");
}
