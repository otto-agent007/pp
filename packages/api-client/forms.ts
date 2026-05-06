import type {
  CustomerPortalFormSubmission,
  FormTemplate,
  JobFormSubmission,
  JobFormSubmissionInput,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type FormsClient = typeof supabase | AuthSupabaseClient;

type JobFormSubmissionRow = JobFormSubmission;

const submissionSelect =
  "*, template:form_templates(*), job:jobs(*, customer:customers(*), location:locations(*))";
const customerPortalSubmissionSelect =
  "id, job_id, form_data, submitted_at, template:form_templates(*), job:jobs!inner(id, customer_id, status)";

function toSubmissionRow(input: JobFormSubmissionInput, submittedBy?: string | null) {
  return {
    job_id: input.job_id,
    template_id: input.template_id,
    form_data: input.form_data,
    submitted_by: submittedBy ?? null,
  };
}

export async function listActiveFormTemplateRecords(client: FormsClient = supabase) {
  const { data, error } = await client
    .from("form_templates")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })
    .order("version", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FormTemplate[];
}

export async function listJobFormSubmissionRecords(
  jobId: string,
  client: FormsClient = supabase,
) {
  const { data, error } = await client
    .from("job_form_submissions")
    .select(submissionSelect)
    .eq("job_id", jobId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as JobFormSubmission[];
}

export async function listCustomerPortalFormSubmissionRecords(
  customerId: string,
  client: FormsClient = supabase,
) {
  const { data, error } = await client
    .from("job_form_submissions")
    .select(customerPortalSubmissionSelect)
    .eq("job.customer_id", customerId)
    .eq("job.status", "completed")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CustomerPortalFormSubmission[];
}

export async function createJobFormSubmissionRecord(
  input: JobFormSubmissionInput,
  client: FormsClient = supabase,
) {
  let submittedBy: string | null = null;

  if ("auth" in client) {
    const { data, error } = await client.auth.getUser();

    if (error) {
      throw error;
    }

    submittedBy = data.user?.id ?? null;
  }

  const { data, error } = await client
    .from("job_form_submissions")
    .insert(toSubmissionRow(input, submittedBy))
    .select(submissionSelect)
    .single<JobFormSubmissionRow>();

  if (error) {
    throw error;
  }

  return data as JobFormSubmission;
}
