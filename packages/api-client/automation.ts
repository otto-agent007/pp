import type {
  AutomationRule,
  AutomationRuleInput,
  AutomationRuleStatus,
  AutomationSchedulerResult,
  AutomationSchedulerRun,
  Job,
  NotificationEvent,
  NotificationDeliveryResult,
  NotificationEventInput,
  NotificationProviderStatus,
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateStatus,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type AutomationRuleRow = AutomationRule;
type AutomationClient = typeof supabase | AuthSupabaseClient;
type AutomationSchedulerRunRow = AutomationSchedulerRun;
type NotificationEventRow = NotificationEvent;
type NotificationTemplateRow = NotificationTemplate;

const ruleSelect = "*, template:notification_templates(*)";
const notificationSelect =
  "*, rule:automation_rules(*), customer:customers(*), job:jobs(*, customer:customers(*), location:locations(*))";
const schedulerJobSelect =
  "*, customer:customers(*), location:locations(*), assigned_technician:profiles(*)";

interface AutomationSchedulerRunInput {
  created_count: number;
  error_message?: string | null;
  evaluated_job_count: number;
  evaluated_rule_count: number;
  finished_at: string;
  skipped_duplicate_count: number;
  started_at: string;
  status: AutomationSchedulerRun["status"];
  triggered_by: AutomationSchedulerRun["triggered_by"];
  triggered_by_user_id?: string | null;
}

export interface NotificationBulkDeliveryRecordResult {
  failed_count: number;
  results: Array<{
    error: string | null;
    event: NotificationEvent | null;
    id: string;
    status: "sent" | "failed";
  }>;
  sent_count: number;
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

function toRuleRow(input: AutomationRuleInput) {
  return {
    name: input.name,
    type: input.type,
    status: "active",
    template_id: input.template_id ?? null,
    offset_days: input.offset_days ?? null,
    message: input.message ?? null,
  };
}

function toNotificationRow(input: NotificationEventInput) {
  return {
    rule_id: input.rule_id ?? null,
    type: input.type,
    generated_key: input.generated_key ?? null,
    customer_id: input.customer_id ?? null,
    job_id: input.job_id ?? null,
    status: input.status ?? "pending",
    handled_at: input.handled_at ?? null,
    title: input.title,
    message: input.message ?? null,
    due_at: input.due_at,
  };
}

function toNotificationTemplateRow(input: NotificationTemplateInput) {
  return {
    name: input.name,
    type: input.type,
    status: "active",
    title: input.title,
    message: input.message ?? null,
  };
}

export async function listAutomationRuleRecords(
  client: AutomationClient = supabase,
) {
  const { data, error } = await client
    .from("automation_rules")
    .select(ruleSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AutomationRule[];
}

export async function listAutomationSchedulerJobRecords(
  client: AutomationClient = supabase,
) {
  const { data, error } = await client
    .from("jobs")
    .select(schedulerJobSelect)
    .eq("status", "completed")
    .order("scheduled_start", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Job[];
}

export async function listAutomationSchedulerRunRecords(
  client: AutomationClient = supabase,
) {
  const { data, error } = await client
    .from("automation_scheduler_runs")
    .select("*")
    .order("finished_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AutomationSchedulerRun[];
}

export async function createAutomationSchedulerRunRecord(
  input: AutomationSchedulerRunInput,
  client: AutomationClient = supabase,
) {
  const { data, error } = await client
    .from("automation_scheduler_runs")
    .insert({
      status: input.status,
      triggered_by: input.triggered_by,
      triggered_by_user_id: input.triggered_by_user_id ?? null,
      started_at: input.started_at,
      finished_at: input.finished_at,
      created_count: input.created_count,
      skipped_duplicate_count: input.skipped_duplicate_count,
      evaluated_rule_count: input.evaluated_rule_count,
      evaluated_job_count: input.evaluated_job_count,
      error_message: input.error_message ?? null,
    })
    .select("*")
    .single<AutomationSchedulerRunRow>();

  if (error) {
    throw error;
  }

  return data as AutomationSchedulerRun;
}

export async function createAutomationRuleRecord(input: AutomationRuleInput) {
  const { data, error } = await supabase
    .from("automation_rules")
    .insert(toRuleRow(input))
    .select(ruleSelect)
    .single<AutomationRuleRow>();

  if (error) {
    throw error;
  }

  return data as AutomationRule;
}

export async function updateAutomationRuleRecord(
  id: string,
  input: AutomationRuleInput,
) {
  const { data, error } = await supabase
    .from("automation_rules")
    .update({
      name: input.name,
      type: input.type,
      template_id: input.template_id ?? null,
      offset_days: input.offset_days ?? null,
      message: input.message ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ruleSelect)
    .single<AutomationRuleRow>();

  if (error) {
    throw error;
  }

  return data as AutomationRule;
}

export async function updateAutomationRuleStatusRecord(
  id: string,
  status: AutomationRuleStatus,
) {
  const { data, error } = await supabase
    .from("automation_rules")
    .update({ status })
    .eq("id", id)
    .select(ruleSelect)
    .single<AutomationRuleRow>();

  if (error) {
    throw error;
  }

  return data as AutomationRule;
}

export async function listNotificationEventRecords() {
  const { data, error } = await supabase
    .from("notification_events")
    .select(notificationSelect)
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as NotificationEvent[];
}

export async function listNotificationTemplateRecords() {
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as NotificationTemplate[];
}

export async function createNotificationTemplateRecord(
  input: NotificationTemplateInput,
) {
  const { data, error } = await supabase
    .from("notification_templates")
    .insert(toNotificationTemplateRow(input))
    .select("*")
    .single<NotificationTemplateRow>();

  if (error) {
    throw error;
  }

  return data as NotificationTemplate;
}

export async function updateNotificationTemplateRecord(
  id: string,
  input: NotificationTemplateInput,
) {
  const { data, error } = await supabase
    .from("notification_templates")
    .update({
      name: input.name,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<NotificationTemplateRow>();

  if (error) {
    throw error;
  }

  return data as NotificationTemplate;
}

export async function updateNotificationTemplateStatusRecord(
  id: string,
  status: NotificationTemplateStatus,
) {
  const { data, error } = await supabase
    .from("notification_templates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single<NotificationTemplateRow>();

  if (error) {
    throw error;
  }

  return data as NotificationTemplate;
}

export async function createNotificationEventRecord(input: NotificationEventInput) {
  const { data, error } = await supabase
    .from("notification_events")
    .insert(toNotificationRow(input))
    .select(notificationSelect)
    .single<NotificationEventRow>();

  if (error) {
    throw error;
  }

  return data as NotificationEvent;
}

export async function createGeneratedNotificationEventRecord(
  input: NotificationEventInput,
  client: AutomationClient = supabase,
) {
  const { data, error } = await client
    .from("notification_events")
    .insert(toNotificationRow(input))
    .select(notificationSelect)
    .single<NotificationEventRow>();

  if (error) {
    if ("code" in error && error.code === "23505") {
      return null;
    }

    throw error;
  }

  return data as NotificationEvent;
}

export async function markNotificationEventHandledRecord(id: string) {
  const { data, error } = await supabase
    .from("notification_events")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(notificationSelect)
    .single<NotificationEventRow>();

  if (error) {
    throw error;
  }

  return data as NotificationEvent;
}

export async function dismissNotificationEventRecord(id: string) {
  const { data, error } = await supabase
    .from("notification_events")
    .update({ status: "dismissed" })
    .eq("id", id)
    .select(notificationSelect)
    .single<NotificationEventRow>();

  if (error) {
    throw error;
  }

  return data as NotificationEvent;
}

export async function sendNotificationEventDeliveryRecord(id: string) {
  const adminAccessToken = await getAccessToken();
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch(
    `/api/automation/notifications/${encodeURIComponent(id)}/deliver`,
    {
      headers,
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to send notification");
  }

  const result = (await response.json()) as NotificationDeliveryResult;

  return result.event;
}

export async function getNotificationProviderStatusRecord() {
  const adminAccessToken = await getAccessToken();
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/automation/notifications/provider-status", {
    headers,
  });

  if (!response.ok) {
    throw new Error("Unable to load notification provider status");
  }

  return (await response.json()) as NotificationProviderStatus;
}

export async function sendNotificationEventDeliveriesRecord(
  ids: string[],
): Promise<NotificationBulkDeliveryRecordResult> {
  const results: NotificationBulkDeliveryRecordResult["results"] = [];

  for (const id of ids) {
    try {
      const event = await sendNotificationEventDeliveryRecord(id);

      results.push({
        error: null,
        event,
        id,
        status: "sent",
      });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : "Unable to send notification",
        event: null,
        id,
        status: "failed",
      });
    }
  }

  return {
    failed_count: results.filter((result) => result.status === "failed").length,
    results,
    sent_count: results.filter((result) => result.status === "sent").length,
  };
}

export async function runAutomationSchedulerManualRecord() {
  const adminAccessToken = await getAccessToken();
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/automation/scheduler/manual", {
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to run scheduler");
  }

  const result = (await response.json()) as {
    result: AutomationSchedulerResult;
    run: AutomationSchedulerRun;
  };

  return result;
}
