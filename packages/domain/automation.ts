import {
  createAutomationRuleRecord,
  createGeneratedNotificationEventRecord,
  createNotificationEventRecord,
  createNotificationTemplateRecord,
  dismissNotificationEventRecord,
  getNotificationProviderStatusRecord,
  listAutomationSchedulerJobRecords,
  listAutomationSchedulerRunRecords,
  listAutomationRuleRecords,
  listNotificationEventRecords,
  listNotificationTemplateRecords,
  markNotificationEventHandledRecord,
  runAutomationSchedulerManualRecord,
  sendNotificationEventDeliveriesRecord,
  sendNotificationEventDeliveryRecord,
  updateAutomationRuleRecord,
  updateNotificationTemplateRecord,
  updateNotificationTemplateStatusRecord,
  updateAutomationRuleStatusRecord,
} from "@pest-patrol/api-client";
import type {
  AutomationRule,
  AutomationRuleInput,
  AutomationRuleStatus,
  AutomationRuleType,
  AutomationSchedulerResult,
  AutomationSchedulerRun,
  Customer,
  Job,
  Location,
  NotificationDeliveryStatus,
  NotificationDeliveryProviderPayload,
  NotificationEvent,
  NotificationEventInput,
  NotificationEventStatus,
  NotificationEventType,
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateStatus,
} from "@pest-patrol/types";

export type AutomationRuleStatusFilter = AutomationRuleStatus | "all";
export type NotificationEventStatusFilter = NotificationEventStatus | "all";
export type NotificationDeliveryStatusFilter =
  | NotificationDeliveryStatus
  | "all"
  | "retryable";
export type NotificationRecipientReadinessFilter =
  | "all"
  | "email"
  | "missing"
  | "phone"
  | "reachable";
export type NotificationTemplateStatusFilter =
  | NotificationTemplateStatus
  | "all";

export interface AutomationSchedulerPlan {
  evaluated_jobs: number;
  evaluated_rules: number;
  notifications: NotificationEventInput[];
}

export interface AutomationSummary {
  activeRules: number;
  failedDeliveries: number;
  overdueNotifications: number;
  pendingNotifications: number;
  recurringRules: number;
}

export interface NotificationDeliveryTriageSummary {
  failed: number;
  manual_review: number;
  not_sent: number;
  retryable: number;
  sent: number;
}

export type NotificationRetryPolicyState =
  | "manual_review"
  | "not_applicable"
  | "retryable";

export interface NotificationDeliveryAttemptSummary {
  attempted: number;
  latest_attempted_at: string | null;
  never_attempted: number;
  total_attempts: number;
}

export interface NotificationRecipientReadiness {
  customer_id: string | null;
  customer_name: string | null;
  email: string | null;
  has_email: boolean;
  has_phone: boolean;
  is_reachable: boolean;
  phone: string | null;
}

export interface NotificationRecipientReadinessSummary {
  email_ready: number;
  missing: number;
  phone_ready: number;
  reachable: number;
}

export interface AutomationSchedulerStatus {
  generatedNotifications: NotificationEvent[];
  lastRun: AutomationSchedulerRun | null;
  lastRunGeneratedCount: number;
  lastRunSkippedDuplicateCount: number;
  lastRunStatus: AutomationSchedulerRun["status"] | "never";
}

export interface AutomationSchedulerPreviewItem {
  is_duplicate: boolean;
  notification: NotificationEventInput;
}

export interface AutomationSchedulerPreview {
  duplicate_count: number;
  evaluated_jobs: number;
  evaluated_rules: number;
  items: AutomationSchedulerPreviewItem[];
}

export interface NotificationBulkDeliveryResult {
  failed_count: number;
  results: Array<{
    error: string | null;
    event: NotificationEvent | null;
    id: string;
    status: "sent" | "failed";
  }>;
  sent_count: number;
}

export function buildNotificationDeliveryProviderPayload(
  notification: NotificationEvent,
): NotificationDeliveryProviderPayload {
  const customer = notification.customer ?? notification.job?.customer ?? null;
  const job = notification.job ?? null;
  const location = notification.job?.location ?? null;

  return {
    event: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      due_at: notification.due_at,
      status: notification.status,
      delivery_status: notification.delivery_status,
      customer_id: notification.customer_id,
      job_id: notification.job_id,
      generated_key: notification.generated_key,
    },
    target: {
      customer_id: notification.customer_id ?? customer?.id ?? null,
      job_id: notification.job_id ?? job?.id ?? null,
      location_id: job?.location_id ?? location?.id ?? null,
    },
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        }
      : null,
    job: job
      ? {
          id: job.id,
          status: job.status,
          scheduled_start: job.scheduled_start,
          scheduled_end: job.scheduled_end,
        }
      : null,
    location: location
      ? {
          id: location.id,
          address: location.address,
          nickname: location.nickname,
        }
      : null,
  };
}

export type NotificationTemplateVariable =
  | "customer.name"
  | "location.address"
  | "location.nickname"
  | "service.date";

export interface NotificationTemplatePreviewContext {
  customer?: Pick<Customer, "name"> | null;
  job?:
    | (Pick<Job, "scheduled_end" | "scheduled_start"> & {
        customer?: Pick<Customer, "name"> | null;
        location?: Pick<Location, "address" | "nickname"> | null;
      })
    | null;
}

export interface NotificationTemplatePreview {
  message: string | null;
  title: string;
}

const ruleTypes: AutomationRuleType[] = [
  "follow_up_reminder",
  "recurring_service_prompt",
];
const notificationEventTypes: NotificationEventType[] = [
  ...ruleTypes,
  "arrival_notification",
];
const notificationEventStatuses: NotificationEventStatus[] = [
  "pending",
  "handled",
  "dismissed",
];
const ruleStatuses: AutomationRuleStatus[] = ["active", "paused", "archived"];
const notificationTemplateVariables: NotificationTemplateVariable[] = [
  "customer.name",
  "location.address",
  "location.nickname",
  "service.date",
];

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeRuleType(value: AutomationRuleType) {
  if (!ruleTypes.includes(value)) {
    throw new Error("Automation rule type is invalid");
  }

  return value;
}

function normalizeNotificationEventType(value: NotificationEventType) {
  if (!notificationEventTypes.includes(value)) {
    throw new Error("Notification event type is invalid");
  }

  return value;
}

function normalizeNotificationEventStatus(value?: NotificationEventStatus | null) {
  if (value === null || value === undefined) {
    return "pending";
  }

  if (!notificationEventStatuses.includes(value)) {
    throw new Error("Notification event status is invalid");
  }

  return value;
}

function normalizeHandledAt(value?: string | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error("Handled at must be valid");
  }

  return normalized;
}

function normalizeOffsetDays(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Offset days must be zero or greater");
  }

  return value;
}

function normalizeDueAt(value: string) {
  const dueAt = requireNonEmpty(value, "Due date");

  if (Number.isNaN(Date.parse(dueAt))) {
    throw new Error("Due date must be valid");
  }

  return dueAt;
}

export function normalizeAutomationRuleInput(
  input: AutomationRuleInput,
): AutomationRuleInput {
  return {
    name: requireNonEmpty(input.name, "Rule name"),
    type: normalizeRuleType(input.type),
    template_id: normalizeOptional(input.template_id),
    offset_days: normalizeOffsetDays(input.offset_days),
    message: normalizeOptional(input.message),
  };
}

export function validateAutomationRuleInput(input: AutomationRuleInput) {
  return normalizeAutomationRuleInput(input);
}

export function normalizeNotificationEventInput(
  input: NotificationEventInput,
): NotificationEventInput {
  const customerId = normalizeOptional(input.customer_id);
  const jobId = normalizeOptional(input.job_id);

  if (!customerId && !jobId) {
    throw new Error("Customer or job is required");
  }

  return {
    rule_id: normalizeOptional(input.rule_id),
    type: normalizeNotificationEventType(input.type),
    generated_key: normalizeOptional(input.generated_key),
    customer_id: customerId,
    job_id: jobId,
    status: normalizeNotificationEventStatus(input.status),
    title: requireNonEmpty(input.title, "Notification title"),
    message: normalizeOptional(input.message),
    due_at: normalizeDueAt(input.due_at),
    handled_at: normalizeHandledAt(input.handled_at),
  };
}

export function validateNotificationEventInput(input: NotificationEventInput) {
  return normalizeNotificationEventInput(input);
}

export function normalizeNotificationTemplateInput(
  input: NotificationTemplateInput,
): NotificationTemplateInput {
  return {
    name: requireNonEmpty(input.name, "Template name"),
    type: normalizeRuleType(input.type),
    title: requireNonEmpty(input.title, "Template title"),
    message: normalizeOptional(input.message),
  };
}

export function validateNotificationTemplateInput(
  input: NotificationTemplateInput,
) {
  return normalizeNotificationTemplateInput(input);
}

function searchableRuleText(rule: AutomationRule) {
  return [rule.name, rule.type, rule.status, rule.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function searchableNotificationText(notification: NotificationEvent) {
  return [
    notification.title,
    notification.message,
    notification.type,
    notification.status,
    notification.customer?.name,
    notification.job?.customer?.name,
    notification.job?.location?.address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function searchableTemplateText(template: NotificationTemplate) {
  return [template.name, template.title, template.message, template.type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterAutomationRules(
  rules: AutomationRule[],
  search: string,
  status: AutomationRuleStatusFilter = "all",
) {
  const query = search.trim().toLowerCase();

  return rules
    .filter((rule) => status === "all" || rule.status === status)
    .filter((rule) => !query || searchableRuleText(rule).includes(query));
}

export function filterNotificationEvents(
  notifications: NotificationEvent[],
  search: string,
  status: NotificationEventStatusFilter = "pending",
  deliveryStatus: NotificationDeliveryStatusFilter = "all",
) {
  const query = search.trim().toLowerCase();

  return notifications
    .filter((notification) => status === "all" || notification.status === status)
    .filter((notification) => {
      if (deliveryStatus === "all") {
        return true;
      }

      if (deliveryStatus === "retryable") {
        return getNotificationRetryPolicyState(notification) === "retryable";
      }

      return notification.delivery_status === deliveryStatus;
    })
    .filter(
      (notification) =>
        !query || searchableNotificationText(notification).includes(query),
    );
}

export function getNotificationDeliveryTriageSummary(
  notifications: NotificationEvent[],
): NotificationDeliveryTriageSummary {
  return {
    failed: notifications.filter(
      (notification) => notification.delivery_status === "failed",
    ).length,
    manual_review: notifications.filter(
      (notification) =>
        getNotificationRetryPolicyState(notification) === "manual_review",
    ).length,
    not_sent: notifications.filter(
      (notification) => notification.delivery_status === "not_sent",
    ).length,
    retryable: getPendingDeliverableNotifications(notifications).length,
    sent: notifications.filter(
      (notification) => notification.delivery_status === "sent",
    ).length,
  };
}

export function getNotificationRecipientReadiness(
  notification: NotificationEvent,
): NotificationRecipientReadiness {
  const customer = notification.customer ?? notification.job?.customer ?? null;
  const email = normalizeOptional(customer?.email);
  const phone = normalizeOptional(customer?.phone);

  return {
    customer_id: customer?.id ?? notification.customer_id,
    customer_name: customer?.name ?? null,
    email,
    has_email: Boolean(email),
    has_phone: Boolean(phone),
    is_reachable: Boolean(email || phone),
    phone,
  };
}

export function getNotificationRecipientReadinessSummary(
  notifications: NotificationEvent[],
): NotificationRecipientReadinessSummary {
  const readiness = notifications.map((notification) =>
    getNotificationRecipientReadiness(notification),
  );

  return {
    email_ready: readiness.filter((item) => item.has_email).length,
    missing: readiness.filter((item) => !item.is_reachable).length,
    phone_ready: readiness.filter((item) => item.has_phone).length,
    reachable: readiness.filter((item) => item.is_reachable).length,
  };
}

export function filterNotificationEventsByRecipient(
  notifications: NotificationEvent[],
  filter: NotificationRecipientReadinessFilter = "all",
) {
  if (filter === "all") {
    return notifications;
  }

  return notifications.filter((notification) => {
    const readiness = getNotificationRecipientReadiness(notification);

    if (filter === "reachable") {
      return readiness.is_reachable;
    }

    if (filter === "missing") {
      return !readiness.is_reachable;
    }

    if (filter === "email") {
      return readiness.has_email;
    }

    return readiness.has_phone;
  });
}

export function getNotificationDeliveryAttemptSummary(
  notifications: NotificationEvent[],
): NotificationDeliveryAttemptSummary {
  const attempted = notifications.filter(
    (notification) =>
      notification.delivery_attempts > 0 ||
      Boolean(notification.last_delivery_attempted_at),
  );
  const latestAttempt = attempted
    .map((notification) => notification.last_delivery_attempted_at)
    .filter((attemptedAt): attemptedAt is string => Boolean(attemptedAt))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  return {
    attempted: attempted.length,
    latest_attempted_at: latestAttempt ?? null,
    never_attempted: notifications.length - attempted.length,
    total_attempts: notifications.reduce(
      (total, notification) => total + notification.delivery_attempts,
      0,
    ),
  };
}

export function filterNotificationTemplates(
  templates: NotificationTemplate[],
  search: string,
  status: NotificationTemplateStatusFilter = "active",
) {
  const query = search.trim().toLowerCase();

  return templates
    .filter((template) => status === "all" || template.status === status)
    .filter(
      (template) => !query || searchableTemplateText(template).includes(query),
    );
}

export function getAutomationSummary(
  rules: AutomationRule[],
  notifications: NotificationEvent[],
  now = new Date().toISOString(),
): AutomationSummary {
  return {
    activeRules: rules.filter((rule) => rule.status === "active").length,
    failedDeliveries: notifications.filter(
      (notification) => notification.delivery_status === "failed",
    ).length,
    recurringRules: rules.filter(
      (rule) =>
        rule.status === "active" && rule.type === "recurring_service_prompt",
    ).length,
    pendingNotifications: notifications.filter(
      (notification) => notification.status === "pending",
    ).length,
    overdueNotifications: notifications.filter(
      (notification) =>
        notification.status === "pending" && notification.due_at < now,
    ).length,
  };
}

export function getAutomationSchedulerStatus(input: {
  notifications: NotificationEvent[];
  runs: AutomationSchedulerRun[];
}): AutomationSchedulerStatus {
  const sortedRuns = [...input.runs].sort(
    (left, right) =>
      Date.parse(right.finished_at) - Date.parse(left.finished_at),
  );
  const generatedNotifications = input.notifications
    .filter((notification) => Boolean(notification.generated_key))
    .sort(
      (left, right) =>
        Date.parse(right.created_at) - Date.parse(left.created_at),
    );
  const lastRun = sortedRuns[0] ?? null;

  return {
    generatedNotifications,
    lastRun,
    lastRunGeneratedCount: lastRun?.created_count ?? 0,
    lastRunSkippedDuplicateCount: lastRun?.skipped_duplicate_count ?? 0,
    lastRunStatus: lastRun?.status ?? "never",
  };
}

export function validateNotificationEventId(id: string) {
  return requireNonEmpty(id, "Notification");
}

export function getNotificationDeliveryLabel(
  status: NotificationDeliveryStatus,
) {
  if (status === "not_sent") {
    return "Not sent";
  }

  if (status === "sending") {
    return "Sending";
  }

  if (status === "sent") {
    return "Sent";
  }

  return "Failed";
}

export function getNotificationRetryPolicyState(
  notification: NotificationEvent,
): NotificationRetryPolicyState {
  if (notification.status !== "pending") {
    return "not_applicable";
  }

  if (notification.delivery_status === "not_sent") {
    return "retryable";
  }

  if (notification.delivery_status === "failed") {
    return notification.delivery_attempts >= 3
      ? "manual_review"
      : "retryable";
  }

  return "not_applicable";
}

export function getNotificationRetryPolicyLabel(
  state: NotificationRetryPolicyState,
) {
  if (state === "retryable") {
    return "Retryable";
  }

  if (state === "manual_review") {
    return "Manual review";
  }

  return "Not applicable";
}

export function getPendingDeliverableNotifications(
  notifications: NotificationEvent[],
) {
  return notifications.filter(
    (notification) =>
      getNotificationRetryPolicyState(notification) === "retryable",
  );
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);

  return date;
}

function jobCompletedAt(job: Job) {
  return job.scheduled_end ?? job.scheduled_start;
}

function customerNameForJob(job: Job) {
  return job.customer?.name ?? "customer";
}

function locationNameForJob(job: Job) {
  return job.location?.nickname ?? job.location?.address ?? "service location";
}

function serviceDateForJob(job: Pick<Job, "scheduled_end" | "scheduled_start">) {
  const value = job.scheduled_end ?? job.scheduled_start;

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function templateVariableValue(
  variable: NotificationTemplateVariable,
  context: NotificationTemplatePreviewContext,
) {
  const customer = context.job?.customer ?? context.customer ?? null;
  const location = context.job?.location ?? null;

  if (variable === "customer.name") {
    return customer?.name ?? "customer";
  }

  if (variable === "location.address") {
    return location?.address ?? "service location";
  }

  if (variable === "location.nickname") {
    return location?.nickname ?? location?.address ?? "service location";
  }

  return context.job ? serviceDateForJob(context.job) : "service date";
}

export function interpolateNotificationTemplateText(
  text: string,
  context: NotificationTemplatePreviewContext = {},
) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, variable: string) => {
    if (
      notificationTemplateVariables.includes(
        variable as NotificationTemplateVariable,
      )
    ) {
      return templateVariableValue(
        variable as NotificationTemplateVariable,
        context,
      );
    }

    return match;
  });
}

export function previewNotificationTemplateCopy(input: {
  context?: NotificationTemplatePreviewContext;
  message?: string | null;
  title: string;
}): NotificationTemplatePreview {
  const context = input.context ?? {};

  return {
    title: interpolateNotificationTemplateText(input.title, context),
    message: input.message
      ? interpolateNotificationTemplateText(input.message, context)
      : null,
  };
}

function dueAtForJob(job: Job, rule: AutomationRule) {
  return addDays(jobCompletedAt(job), rule.offset_days ?? 0);
}

function activeMatchingTemplate(rule: AutomationRule) {
  if (
    rule.template &&
    rule.template.status === "active" &&
    rule.template.type === rule.type
  ) {
    return rule.template;
  }

  return null;
}

function latestCompletedJobsByCustomer(jobs: Job[]) {
  const latest = new Map<string, Job>();

  jobs.forEach((job) => {
    const current = latest.get(job.customer_id);

    if (
      !current ||
      Date.parse(jobCompletedAt(job)) > Date.parse(jobCompletedAt(current))
    ) {
      latest.set(job.customer_id, job);
    }
  });

  return Array.from(latest.values());
}

function followUpInput(rule: AutomationRule, job: Job, dueAt: Date) {
  const customerName = customerNameForJob(job);
  const template = activeMatchingTemplate(rule);
  const templateCopy = template
    ? previewNotificationTemplateCopy({
        context: { job },
        message: template.message,
        title: template.title,
      })
    : null;

  return validateNotificationEventInput({
    rule_id: rule.id,
    type: "follow_up_reminder",
    generated_key: `automation:${rule.id}:follow_up:${job.id}`,
    customer_id: job.customer_id,
    job_id: job.id,
    title: templateCopy?.title ?? `Follow up with ${customerName}`,
    message:
      templateCopy?.message ??
      rule.message ??
      `Check in after service at ${locationNameForJob(job)}.`,
    due_at: dueAt.toISOString(),
  });
}

function recurringInput(rule: AutomationRule, job: Job, dueAt: Date) {
  const customerName = customerNameForJob(job);
  const template = activeMatchingTemplate(rule);
  const templateCopy = template
    ? previewNotificationTemplateCopy({
        context: { job },
        message: template.message,
        title: template.title,
      })
    : null;

  return validateNotificationEventInput({
    rule_id: rule.id,
    type: "recurring_service_prompt",
    generated_key: `automation:${rule.id}:recurring:${job.customer_id}:${dueAt.toISOString().slice(0, 10)}`,
    customer_id: job.customer_id,
    job_id: job.id,
    title:
      templateCopy?.title ?? `Schedule recurring service for ${customerName}`,
    message:
      templateCopy?.message ??
      rule.message ??
      `Review recurring service timing for ${locationNameForJob(job)}.`,
    due_at: dueAt.toISOString(),
  });
}

export function buildAutomationSchedulerPlan(input: {
  jobs: Job[];
  now?: string;
  rules: AutomationRule[];
}): AutomationSchedulerPlan {
  const now = input.now ? new Date(input.now) : new Date();
  const activeRules = input.rules.filter((rule) => rule.status === "active");
  const completedJobs = input.jobs.filter((job) => job.status === "completed");
  const notifications = activeRules.flatMap((rule) => {
    if (rule.type === "follow_up_reminder") {
      return completedJobs.flatMap((job) => {
        const dueAt = dueAtForJob(job, rule);

        return dueAt <= now ? [followUpInput(rule, job, dueAt)] : [];
      });
    }

    return latestCompletedJobsByCustomer(completedJobs).flatMap((job) => {
      const dueAt = dueAtForJob(job, rule);

      return dueAt <= now ? [recurringInput(rule, job, dueAt)] : [];
    });
  });

  return {
    evaluated_jobs: completedJobs.length,
    evaluated_rules: activeRules.length,
    notifications,
  };
}

export function buildAutomationSchedulerPreview(input: {
  existingNotifications: NotificationEvent[];
  jobs: Job[];
  now?: string;
  rules: AutomationRule[];
}): AutomationSchedulerPreview {
  const plan = buildAutomationSchedulerPlan({
    jobs: input.jobs,
    now: input.now,
    rules: input.rules,
  });
  const generatedKeys = new Set(
    input.existingNotifications
      .map((notification) => notification.generated_key)
      .filter(Boolean),
  );
  const items = plan.notifications.map((notification) => ({
    is_duplicate: notification.generated_key
      ? generatedKeys.has(notification.generated_key)
      : false,
    notification,
  }));

  return {
    duplicate_count: items.filter((item) => item.is_duplicate).length,
    evaluated_jobs: plan.evaluated_jobs,
    evaluated_rules: plan.evaluated_rules,
    items,
  };
}

export function statusForAutomationRule(
  status: AutomationRuleStatus,
): AutomationRuleStatus {
  if (!ruleStatuses.includes(status)) {
    throw new Error("Automation rule status is invalid");
  }

  return status;
}

export function statusForNotificationTemplate(
  status: NotificationTemplateStatus,
): NotificationTemplateStatus {
  if (status !== "active" && status !== "archived") {
    throw new Error("Notification template status is invalid");
  }

  return status;
}

export async function listAutomationRules() {
  return listAutomationRuleRecords();
}

export async function listAutomationSchedulerRuns() {
  return listAutomationSchedulerRunRecords();
}

export async function createAutomationRule(input: AutomationRuleInput) {
  return createAutomationRuleRecord(validateAutomationRuleInput(input));
}

export async function updateAutomationRule(
  id: string,
  input: AutomationRuleInput,
) {
  return updateAutomationRuleRecord(
    requireNonEmpty(id, "Automation rule"),
    validateAutomationRuleInput(input),
  );
}

export async function updateAutomationRuleStatus(
  id: string,
  status: AutomationRuleStatus,
) {
  return updateAutomationRuleStatusRecord(
    requireNonEmpty(id, "Automation rule"),
    statusForAutomationRule(status),
  );
}

export async function listNotificationEvents() {
  return listNotificationEventRecords();
}

export async function listNotificationTemplates() {
  return listNotificationTemplateRecords();
}

export async function createNotificationTemplate(
  input: NotificationTemplateInput,
) {
  return createNotificationTemplateRecord(
    validateNotificationTemplateInput(input),
  );
}

export async function updateNotificationTemplate(
  id: string,
  input: NotificationTemplateInput,
) {
  return updateNotificationTemplateRecord(
    requireNonEmpty(id, "Notification template"),
    validateNotificationTemplateInput(input),
  );
}

export async function archiveNotificationTemplate(id: string) {
  return updateNotificationTemplateStatusRecord(
    requireNonEmpty(id, "Notification template"),
    "archived",
  );
}

export async function restoreNotificationTemplate(id: string) {
  return updateNotificationTemplateStatusRecord(
    requireNonEmpty(id, "Notification template"),
    "active",
  );
}

export async function createNotificationEvent(input: NotificationEventInput) {
  return createNotificationEventRecord(validateNotificationEventInput(input));
}

export async function markNotificationEventHandled(id: string) {
  return markNotificationEventHandledRecord(validateNotificationEventId(id));
}

export async function dismissNotificationEvent(id: string) {
  return dismissNotificationEventRecord(validateNotificationEventId(id));
}

export async function sendNotificationEventDelivery(id: string) {
  return sendNotificationEventDeliveryRecord(validateNotificationEventId(id));
}

export async function getNotificationProviderStatus() {
  return getNotificationProviderStatusRecord();
}

export async function sendNotificationEventDeliveries(
  ids: string[],
): Promise<NotificationBulkDeliveryResult> {
  const normalizedIds = ids.map((id) => validateNotificationEventId(id));

  if (normalizedIds.length === 0) {
    return {
      failed_count: 0,
      results: [],
      sent_count: 0,
    };
  }

  return sendNotificationEventDeliveriesRecord(normalizedIds);
}

export async function runAutomationSchedulerManual() {
  return runAutomationSchedulerManualRecord();
}

export async function runAutomationSchedulerForClient(
  client: Parameters<typeof listAutomationSchedulerJobRecords>[0],
  now = new Date().toISOString(),
): Promise<AutomationSchedulerResult> {
  const [rules, jobs] = await Promise.all([
    listAutomationRuleRecords(client),
    listAutomationSchedulerJobRecords(client),
  ]);
  const plan = buildAutomationSchedulerPlan({ jobs, now, rules });
  let created = 0;
  let skippedDuplicates = 0;

  for (const notification of plan.notifications) {
    const event = await createGeneratedNotificationEventRecord(
      notification,
      client,
    );

    if (event) {
      created += 1;
    } else {
      skippedDuplicates += 1;
    }
  }

  return {
    created,
    evaluated_jobs: plan.evaluated_jobs,
    evaluated_rules: plan.evaluated_rules,
    skipped_duplicates: skippedDuplicates,
  };
}
