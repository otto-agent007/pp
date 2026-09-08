import type { Customer } from "./customers";
import type { Job, JobStatus } from "./jobs";
import type { NotificationProviderReadinessState } from "./providerReadiness";

export type AutomationRuleType =
  | "follow_up_reminder"
  | "recurring_service_prompt";

export type NotificationEventType = AutomationRuleType | "arrival_notification";

export type AutomationRuleStatus = "active" | "paused" | "archived";

export type NotificationEventStatus = "pending" | "handled" | "dismissed";

export type NotificationTemplateStatus = "active" | "archived";

export type NotificationDeliveryStatus =
  | "not_sent"
  | "sending"
  | "sent"
  | "failed";

export type NotificationDeliveryProvider = "manual" | "webhook";

export type AutomationSchedulerRunStatus = "success" | "failed";

export type AutomationSchedulerRunTrigger = "cron" | "manual";

export interface AutomationRule {
  id: string;
  name: string;
  type: AutomationRuleType;
  status: AutomationRuleStatus;
  template_id: string | null;
  offset_days: number | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  template?: NotificationTemplate | null;
}

export interface AutomationRuleInput {
  name: string;
  type: AutomationRuleType;
  template_id?: string | null;
  offset_days?: number | null;
  message?: string | null;
}

export interface NotificationEvent {
  id: string;
  rule_id: string | null;
  type: NotificationEventType;
  generated_key: string | null;
  customer_id: string | null;
  job_id: string | null;
  status: NotificationEventStatus;
  title: string;
  message: string | null;
  due_at: string;
  handled_at: string | null;
  delivery_status: NotificationDeliveryStatus;
  delivery_provider: NotificationDeliveryProvider | null;
  provider_message_id: string | null;
  delivery_attempts: number;
  last_delivery_attempted_at: string | null;
  delivered_at: string | null;
  last_delivery_error: string | null;
  created_at: string;
  updated_at: string;
  rule?: AutomationRule | null;
  customer?: Customer | null;
  job?: Job | null;
}

export interface NotificationEventInput {
  rule_id?: string | null;
  type: NotificationEventType;
  generated_key?: string | null;
  customer_id?: string | null;
  job_id?: string | null;
  status?: NotificationEventStatus;
  title: string;
  message?: string | null;
  due_at: string;
  handled_at?: string | null;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: AutomationRuleType;
  status: NotificationTemplateStatus;
  title: string;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateInput {
  name: string;
  type: AutomationRuleType;
  title: string;
  message?: string | null;
}

export interface NotificationDeliveryResult {
  event: NotificationEvent;
  provider: NotificationDeliveryProvider;
  provider_message_id: string | null;
}

export interface NotificationDeliveryProviderPayload {
  event: {
    id: string;
    type: NotificationEventType;
    title: string;
    message: string | null;
    due_at: string;
    status: NotificationEventStatus;
    delivery_status: NotificationDeliveryStatus;
    customer_id: string | null;
    job_id: string | null;
    generated_key: string | null;
  };
  target: {
    customer_id: string | null;
    job_id: string | null;
    location_id: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  job: {
    id: string;
    status: JobStatus;
    scheduled_start: string;
    scheduled_end: string | null;
  } | null;
  location: {
    id: string;
    address: string;
    nickname: string | null;
  } | null;
}

export interface NotificationProviderStatus {
  manual_fallback?: boolean;
  provider: NotificationDeliveryProvider;
  readiness_state?: NotificationProviderReadinessState;
  webhook_configured: boolean;
  webhook_secret_configured: boolean;
}

export interface AutomationSchedulerResult {
  created: number;
  skipped_duplicates: number;
  evaluated_rules: number;
  evaluated_jobs: number;
}

export interface AutomationSchedulerRun {
  id: string;
  status: AutomationSchedulerRunStatus;
  triggered_by: AutomationSchedulerRunTrigger;
  triggered_by_user_id: string | null;
  started_at: string;
  finished_at: string;
  created_count: number;
  skipped_duplicate_count: number;
  evaluated_rule_count: number;
  evaluated_job_count: number;
  error_message: string | null;
}
