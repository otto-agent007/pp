"use client";

import {
  buildAutomationSchedulerPreview,
  filterAutomationRules,
  filterNotificationEvents,
  filterNotificationEventsByRecipient,
  filterNotificationTemplates,
  getAutomationSummary,
  getAutomationSchedulerStatus,
  getNotificationDeliveryAttemptSummary,
  getNotificationDeliveryLabel,
  getNotificationDeliveryTriageSummary,
  getNotificationRecipientReadiness,
  getNotificationRecipientReadinessSummary,
  getNotificationRetryPolicyLabel,
  getNotificationRetryPolicyState,
  getPendingDeliverableNotifications,
  getProviderReadinessCopy,
  previewNotificationTemplateCopy,
  validateAutomationRuleInput,
  validateNotificationEventInput,
  validateNotificationTemplateInput,
  type AutomationRuleStatusFilter,
  type NotificationDeliveryStatusFilter,
  type NotificationEventStatusFilter,
  type NotificationRecipientReadinessFilter,
  type NotificationTemplateStatusFilter,
} from "@pest-patrol/domain";
import type {
  AutomationRuleInput,
  AutomationRuleType,
  Customer,
  Job,
  NotificationEvent,
  NotificationEventInput,
  NotificationTemplate,
  NotificationTemplateInput,
  AutomationRule,
  AutomationSchedulerRun,
} from "@pest-patrol/types";
import {
  Button,
  Card,
  CountTile,
  Eyebrow,
  SearchableSelect,
  StatTile,
  StatusPill,
  type StatusPillTone,
} from "@pest-patrol/ui";
import { FormEvent, useMemo, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import { useJobs } from "../../hooks/useJobs";
import {
  useAutomationRules,
  useAutomationSchedulerRuns,
  useArchiveNotificationTemplate,
  useCreateAutomationRule,
  useCreateNotificationEvent,
  useCreateNotificationTemplate,
  useDismissNotificationEvent,
  useMarkNotificationEventHandled,
  useNotificationEvents,
  useNotificationProviderStatus,
  useNotificationTemplates,
  useRunAutomationScheduler,
  useSendNotificationBulkDelivery,
  useSendNotificationEventDelivery,
  useRestoreNotificationTemplate,
  useUpdateAutomationRule,
  useUpdateNotificationTemplate,
  useUpdateAutomationRuleStatus,
} from "../../hooks/useAutomation";

interface RuleFormState {
  id: string | null;
  message: string;
  name: string;
  offset_days: string;
  template_id: string;
  type: AutomationRuleType;
}

interface NotificationFormState {
  customer_id: string;
  due_at: string;
  job_id: string;
  message: string;
  rule_id: string;
  template_id: string;
  title: string;
  type: AutomationRuleType;
}

interface TemplateFormState {
  id: string | null;
  message: string;
  name: string;
  title: string;
  type: AutomationRuleType;
}

const emptyRuleForm: RuleFormState = {
  id: null,
  message: "",
  name: "",
  offset_days: "7",
  template_id: "",
  type: "follow_up_reminder",
};
const emptyNotificationForm: NotificationFormState = {
  customer_id: "",
  due_at: "",
  job_id: "",
  message: "",
  rule_id: "",
  template_id: "",
  title: "",
  type: "follow_up_reminder",
};
const emptyTemplateForm: TemplateFormState = {
  id: null,
  message: "",
  name: "",
  title: "",
  type: "follow_up_reminder",
};
const emptyCustomers: Customer[] = [];
const emptyJobs: Job[] = [];
const emptyRules: AutomationRule[] = [];
const emptyNotifications: NotificationEvent[] = [];
const emptyTemplates: NotificationTemplate[] = [];
const emptySchedulerRuns: AutomationSchedulerRun[] = [];

function formatType(type: AutomationRuleType) {
  return type === "follow_up_reminder"
    ? "Follow-up reminder"
    : "Recurring service prompt";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSchedulerTrigger(run: AutomationSchedulerRun) {
  return run.triggered_by === "manual" ? "Manual" : "Cron";
}

function jobLabel(job: Job) {
  const customer = job.customer?.name ?? "Unknown customer";
  const location = job.location?.address ?? "No location";
  const scheduled = new Intl.DateTimeFormat("en", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(job.scheduled_start));

  return `${scheduled} - ${customer} - ${location}`;
}

function schedulerPreviewTarget(
  notification: NotificationEventInput,
  jobs: Job[],
  customers: Customer[],
) {
  const job = jobs.find((item) => item.id === notification.job_id);

  if (job) {
    const customer = job.customer?.name ?? "Unknown customer";
    const location = job.location?.address ?? "No location";

    return `${customer} - ${location}`;
  }

  const customer = customers.find(
    (item) => item.id === notification.customer_id,
  );

  return customer?.name ?? "No target";
}

function recipientLabel(notification: NotificationEvent) {
  const readiness = getNotificationRecipientReadiness(notification);
  const email = readiness.has_email ? "Email ready" : "Email missing";
  const phone = readiness.has_phone ? "Phone ready" : "Phone missing";

  return `Recipient: ${readiness.customer_name ?? "No customer"} | ${email} | ${phone}`;
}

function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
      {children}
    </p>
  );
}

function deliveryTone(
  status: NotificationEvent["delivery_status"],
): StatusPillTone {
  if (status === "sent") {
    return "success";
  }

  if (status === "failed") {
    return "danger";
  }

  if (status === "sending") {
    return "warning";
  }

  return "neutral";
}

function ruleStatusTone(status: AutomationRule["status"]): StatusPillTone {
  if (status === "active") {
    return "success";
  }

  if (status === "paused") {
    return "warning";
  }

  return "neutral";
}

export function AutomationClient() {
  const rulesQuery = useAutomationRules();
  const schedulerRunsQuery = useAutomationSchedulerRuns();
  const notificationsQuery = useNotificationEvents();
  const providerStatusQuery = useNotificationProviderStatus();
  const templatesQuery = useNotificationTemplates();
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const updateRuleStatus = useUpdateAutomationRuleStatus();
  const createNotification = useCreateNotificationEvent();
  const createTemplate = useCreateNotificationTemplate();
  const updateTemplate = useUpdateNotificationTemplate();
  const archiveTemplate = useArchiveNotificationTemplate();
  const restoreTemplate = useRestoreNotificationTemplate();
  const markHandled = useMarkNotificationEventHandled();
  const dismissNotification = useDismissNotificationEvent();
  const sendNotification = useSendNotificationEventDelivery();
  const sendBulkNotifications = useSendNotificationBulkDelivery();
  const runScheduler = useRunAutomationScheduler();
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleStatus, setRuleStatus] =
    useState<AutomationRuleStatusFilter>("active");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationEventStatusFilter>("pending");
  const [notificationDeliveryStatus, setNotificationDeliveryStatus] =
    useState<NotificationDeliveryStatusFilter>("all");
  const [notificationRecipientFilter, setNotificationRecipientFilter] =
    useState<NotificationRecipientReadinessFilter>("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateStatus, setTemplateStatus] =
    useState<NotificationTemplateStatusFilter>("active");
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm);
  const [notificationForm, setNotificationForm] =
    useState<NotificationFormState>(emptyNotificationForm);
  const [templateForm, setTemplateForm] =
    useState<TemplateFormState>(emptyTemplateForm);
  const [schedulerPreviewNow, setSchedulerPreviewNow] = useState(() =>
    new Date().toISOString(),
  );
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const [templateError, setTemplateError] = useState<string | null>(null);
  const rules = rulesQuery.data ?? emptyRules;
  const notifications = notificationsQuery.data ?? emptyNotifications;
  const templates = templatesQuery.data ?? emptyTemplates;
  const schedulerRuns = schedulerRunsQuery.data ?? emptySchedulerRuns;
  const activeRules = useMemo(
    () => rules.filter((rule) => rule.status === "active"),
    [rules],
  );
  const activeTemplates = useMemo(
    () => templates.filter((template) => template.status === "active"),
    [templates],
  );
  const matchingRuleTemplates = useMemo(
    () => activeTemplates.filter((template) => template.type === ruleForm.type),
    [activeTemplates, ruleForm.type],
  );
  const activeCustomers = useMemo(
    () =>
      (customersQuery.data ?? emptyCustomers).filter(
        (customer) => customer.status === "active",
      ),
    [customersQuery.data],
  );
  const jobs = jobsQuery.data ?? emptyJobs;
  const reminderTemplateOptions = useMemo(
    () => [
      { label: "No template", value: "" },
      ...activeTemplates.map((template) => ({
        keywords: [template.title, template.message].filter(
          (value): value is string => Boolean(value),
        ),
        label: template.name,
        value: template.id,
      })),
    ],
    [activeTemplates],
  );
  const reminderRuleOptions = useMemo(
    () => [
      { label: "Manual reminder", value: "" },
      ...activeRules.map((rule) => ({
        keywords: [rule.message, rule.template?.name].filter(
          (value): value is string => Boolean(value),
        ),
        label: rule.name,
        value: rule.id,
      })),
    ],
    [activeRules],
  );
  const reminderCustomerOptions = useMemo(
    () => [
      { label: "No customer", value: "" },
      ...activeCustomers.map((customer) => ({
        keywords: [
          customer.email,
          customer.phone,
          customer.service_notes,
        ].filter((value): value is string => Boolean(value)),
        label: customer.name,
        value: customer.id,
      })),
    ],
    [activeCustomers],
  );
  const reminderJobOptions = useMemo(
    () => [
      { label: "No job", value: "" },
      ...jobs.map((job) => ({
        keywords: [
          job.customer?.name,
          job.location?.address,
          job.location?.nickname,
          job.service_notes,
        ].filter((value): value is string => Boolean(value)),
        label: jobLabel(job),
        value: job.id,
      })),
    ],
    [jobs],
  );
  const selectedNotificationJob = useMemo(
    () => jobs.find((job) => job.id === notificationForm.job_id) ?? null,
    [jobs, notificationForm.job_id],
  );
  const selectedNotificationCustomer = useMemo(
    () =>
      selectedNotificationJob?.customer ??
      activeCustomers.find(
        (customer) => customer.id === notificationForm.customer_id,
      ) ??
      null,
    [activeCustomers, notificationForm.customer_id, selectedNotificationJob],
  );
  const notificationPreview = useMemo(
    () =>
      previewNotificationTemplateCopy({
        context: {
          customer: selectedNotificationCustomer,
          job: selectedNotificationJob,
        },
        message: notificationForm.message,
        title: notificationForm.title,
      }),
    [
      notificationForm.message,
      notificationForm.title,
      selectedNotificationCustomer,
      selectedNotificationJob,
    ],
  );
  const templatePreviewJob = jobs[0] ?? null;
  const templatePreviewCustomer =
    templatePreviewJob?.customer ?? activeCustomers[0] ?? null;
  const templatePreview = useMemo(
    () =>
      previewNotificationTemplateCopy({
        context: {
          customer: templatePreviewCustomer,
          job: templatePreviewJob,
        },
        message: templateForm.message,
        title: templateForm.title,
      }),
    [
      templateForm.message,
      templateForm.title,
      templatePreviewCustomer,
      templatePreviewJob,
    ],
  );
  const visibleRules = useMemo(
    () => filterAutomationRules(rules, ruleSearch, ruleStatus),
    [rules, ruleSearch, ruleStatus],
  );
  const visibleNotifications = useMemo(
    () =>
      filterNotificationEventsByRecipient(
        filterNotificationEvents(
          notifications,
          notificationSearch,
          notificationStatus,
          notificationDeliveryStatus,
        ),
        notificationRecipientFilter,
      ),
    [
      notifications,
      notificationDeliveryStatus,
      notificationRecipientFilter,
      notificationSearch,
      notificationStatus,
    ],
  );
  const deliverableVisibleNotifications = useMemo(
    () => getPendingDeliverableNotifications(visibleNotifications),
    [visibleNotifications],
  );
  const visibleTemplates = useMemo(
    () =>
      filterNotificationTemplates(templates, templateSearch, templateStatus),
    [templates, templateSearch, templateStatus],
  );
  const summary = useMemo(
    () => getAutomationSummary(rules, notifications),
    [rules, notifications],
  );
  const deliveryTriageSummary = useMemo(
    () => getNotificationDeliveryTriageSummary(notifications),
    [notifications],
  );
  const recipientReadinessSummary = useMemo(
    () => getNotificationRecipientReadinessSummary(notifications),
    [notifications],
  );
  const deliveryAttemptSummary = useMemo(
    () => getNotificationDeliveryAttemptSummary(notifications),
    [notifications],
  );
  const schedulerStatus = useMemo(
    () =>
      getAutomationSchedulerStatus({
        notifications,
        runs: schedulerRuns,
      }),
    [notifications, schedulerRuns],
  );
  const schedulerPreview = useMemo(
    () =>
      buildAutomationSchedulerPreview({
        existingNotifications: notifications,
        jobs,
        now: schedulerPreviewNow,
        rules,
      }),
    [jobs, notifications, rules, schedulerPreviewNow],
  );
  const providerStatus = providerStatusQuery.data;
  const providerReadinessCopy = getProviderReadinessCopy(
    "notification",
    providerStatus,
  );

  async function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleError(null);

    try {
      const input: AutomationRuleInput = validateAutomationRuleInput({
        name: ruleForm.name,
        type: ruleForm.type,
        template_id: ruleForm.template_id || null,
        offset_days:
          ruleForm.offset_days === "" ? null : Number(ruleForm.offset_days),
        message: ruleForm.message,
      });

      if (ruleForm.id) {
        await updateRule.mutateAsync({
          id: ruleForm.id,
          input,
        });
      } else {
        await createRule.mutateAsync(input);
      }

      setRuleForm(emptyRuleForm);
    } catch (error) {
      setRuleError(
        error instanceof Error ? error.message : "Unable to create rule",
      );
    }
  }

  async function submitNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotificationError(null);

    try {
      const rule = activeRules.find(
        (item) => item.id === notificationForm.rule_id,
      );
      const copy = previewNotificationTemplateCopy({
        context: {
          customer: selectedNotificationCustomer,
          job: selectedNotificationJob,
        },
        message: notificationForm.message || rule?.message || null,
        title: notificationForm.title,
      });
      const input: NotificationEventInput = validateNotificationEventInput({
        rule_id: rule?.id ?? null,
        type: rule?.type ?? notificationForm.type,
        customer_id: notificationForm.customer_id || null,
        job_id: notificationForm.job_id || null,
        title: copy.title,
        message: copy.message,
        due_at: notificationForm.due_at,
      });
      await createNotification.mutateAsync(input);
      setNotificationForm(emptyNotificationForm);
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : "Unable to create reminder",
      );
    }
  }

  async function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTemplateError(null);

    try {
      const input: NotificationTemplateInput =
        validateNotificationTemplateInput({
          name: templateForm.name,
          type: templateForm.type,
          title: templateForm.title,
          message: templateForm.message,
        });

      if (templateForm.id) {
        await updateTemplate.mutateAsync({
          id: templateForm.id,
          input,
        });
      } else {
        await createTemplate.mutateAsync(input);
      }

      setTemplateForm(emptyTemplateForm);
    } catch (error) {
      setTemplateError(
        error instanceof Error ? error.message : "Unable to save template",
      );
    }
  }

  function applyTemplate(template: NotificationTemplate) {
    setNotificationForm((current) => ({
      ...current,
      message: template.message ?? "",
      template_id: template.id,
      title: template.title,
      type: template.type,
    }));
  }

  function editTemplate(template: NotificationTemplate) {
    setTemplateError(null);
    setTemplateForm({
      id: template.id,
      message: template.message ?? "",
      name: template.name,
      title: template.title,
      type: template.type,
    });
  }

  function editRule(rule: AutomationRule) {
    setRuleError(null);
    setRuleForm({
      id: rule.id,
      message: rule.message ?? "",
      name: rule.name,
      offset_days: rule.offset_days === null ? "" : String(rule.offset_days),
      template_id:
        rule.template?.status === "active" && rule.template.type === rule.type
          ? (rule.template_id ?? "")
          : "",
      type: rule.type,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Admin</Eyebrow>
          <h1 className="text-3xl font-bold text-theme-text-primary">Automation</h1>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <Eyebrow tone="accent">Operator snapshot</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-5">
          <StatTile label="Active rules" value={summary.activeRules} />
          <StatTile label="Recurring" value={summary.recurringRules} />
          <StatTile
            label="Pending"
            tone="info"
            value={summary.pendingNotifications}
          />
          <StatTile
            label="Overdue"
            tone={summary.overdueNotifications > 0 ? "danger" : "success"}
            value={summary.overdueNotifications}
          />
          <StatTile
            label="Failed delivery"
            tone={summary.failedDeliveries > 0 ? "danger" : "success"}
            value={summary.failedDeliveries}
          />
        </div>
      </section>

      <section className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Eyebrow>Scheduler</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold text-theme-text-primary">
              Notification generation
            </h2>
            {schedulerRunsQuery.isLoading ? (
              <p className="mt-2 text-sm text-theme-text-secondary">
                Loading scheduler status
              </p>
            ) : schedulerStatus.lastRun ? (
              <p className="mt-2 text-sm text-theme-text-secondary">
                Last run {formatDateTime(schedulerStatus.lastRun.finished_at)}{" "}
                by {formatSchedulerTrigger(schedulerStatus.lastRun)}
                {schedulerStatus.lastRun.triggered_by_user_id
                  ? ` (${schedulerStatus.lastRun.triggered_by_user_id})`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-theme-text-secondary">
                Scheduler has not run yet
              </p>
            )}
            {schedulerStatus.lastRun?.error_message ? (
              <p className="mt-3 rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-2 text-sm font-semibold text-status-alert-danger-fg">
                {schedulerStatus.lastRun.error_message}
              </p>
            ) : null}
            {runScheduler.isSuccess ? (
              <p className="mt-3 rounded-md border border-status-alert-success-border bg-status-alert-success-bg p-2 text-sm font-semibold text-status-alert-success-fg">
                Scheduler run complete
              </p>
            ) : null}
            {runScheduler.isError ? (
              <p className="mt-3 rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-2 text-sm font-semibold text-status-alert-danger-fg">
                Unable to run scheduler
              </p>
            ) : null}
            <Button
              className="mt-4"
              disabled={runScheduler.isPending}
              onClick={() => runScheduler.mutate()}
            >
              {runScheduler.isPending ? "Running scheduler" : "Run scheduler"}
            </Button>
            <Button
              className="ml-2 mt-4"
              onClick={() => setSchedulerPreviewNow(new Date().toISOString())}
              variant="ghost"
            >
              Refresh preview
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Last status
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerStatus.lastRunStatus}
              </p>
            </div>
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Created
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerStatus.lastRunGeneratedCount}
              </p>
            </div>
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Duplicates
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerStatus.lastRunSkippedDuplicateCount}
              </p>
            </div>
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Preview due
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerPreview.items.length}
              </p>
            </div>
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Preview rules
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerPreview.evaluated_rules}
              </p>
            </div>
            <div className="rounded-md bg-theme-background-subtle p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Preview duplicates
              </p>
              <p className="mt-2 text-lg font-bold text-theme-text-primary">
                {schedulerPreview.duplicate_count}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-theme-text-muted">
                Due preview
              </h3>
              <p className="mt-1 text-sm text-theme-text-secondary">
                Evaluated {schedulerPreview.evaluated_jobs} completed jobs and{" "}
                {schedulerPreview.evaluated_rules} active rules
              </p>
            </div>
            <p className="text-xs font-medium text-theme-text-muted">
              Previewed {formatDateTime(schedulerPreviewNow)}
            </p>
          </div>
          {schedulerPreview.items.length === 0 ? (
            <EmptyState>No due scheduler notifications to preview</EmptyState>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {schedulerPreview.items.slice(0, 6).map((item) => (
                <article
                  className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
                  key={
                    item.notification.generated_key ??
                    `${item.notification.type}-${item.notification.due_at}`
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-theme-text-primary">
                      {item.notification.title}
                    </p>
                    <StatusPill
                      dot={false}
                      tone={item.is_duplicate ? "warning" : "success"}
                    >
                      {item.is_duplicate ? "Duplicate" : "New"}
                    </StatusPill>
                  </div>
                  {item.notification.message ? (
                    <p className="mt-2 text-sm text-theme-text-secondary">
                      {item.notification.message}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-theme-text-secondary">
                    {formatType(item.notification.type)}
                  </p>
                  <p className="mt-1 text-xs text-theme-text-secondary">
                    Due {formatDateTime(item.notification.due_at)}
                  </p>
                  <p className="mt-1 text-xs text-theme-text-secondary">
                    {schedulerPreviewTarget(
                      item.notification,
                      jobs,
                      activeCustomers,
                    )}
                  </p>
                  {item.notification.generated_key ? (
                    <p className="mt-2 break-all text-xs text-theme-text-muted">
                      {item.notification.generated_key}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-theme-text-muted">
            Latest generated notifications
          </h3>
          {schedulerStatus.generatedNotifications.length === 0 ? (
            <EmptyState>No generated notifications yet</EmptyState>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {schedulerStatus.generatedNotifications
                .slice(0, 3)
                .map((item) => (
                  <article
                    className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
                    key={item.id}
                  >
                    <p className="text-sm font-semibold text-theme-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs font-medium text-theme-text-secondary">
                      {formatType(item.type)}
                    </p>
                    <p className="mt-1 text-xs text-theme-text-secondary">
                      Generated {formatDateTime(item.created_at)}
                    </p>
                  </article>
                ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_190px]">
              <input
                aria-label="Search notifications"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) => setNotificationSearch(event.target.value)}
                placeholder="Search notifications"
                value={notificationSearch}
              />
              <select
                aria-label="Notification status"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationStatus(
                    event.target.value as NotificationEventStatusFilter,
                  )
                }
                value={notificationStatus}
              >
                <option value="pending">Pending</option>
                <option value="handled">Handled</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All</option>
              </select>
              <select
                aria-label="Notification delivery status"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationDeliveryStatus(
                    event.target.value as NotificationDeliveryStatusFilter,
                  )
                }
                value={notificationDeliveryStatus}
              >
                <option value="all">All delivery</option>
                <option value="retryable">Retryable</option>
                <option value="failed">Failed</option>
                <option value="not_sent">Not sent</option>
                <option value="sending">Sending</option>
                <option value="sent">Sent</option>
              </select>
              <select
                aria-label="Notification recipient readiness"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationRecipientFilter(
                    event.target.value as NotificationRecipientReadinessFilter,
                  )
                }
                value={notificationRecipientFilter}
              >
                <option value="all">All recipients</option>
                <option value="reachable">Reachable</option>
                <option value="missing">Missing contact</option>
                <option value="email">Email ready</option>
                <option value="phone">Phone ready</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="basis-full">
                <Eyebrow>Delivery health</Eyebrow>
              </div>
              <CountTile
                active={notificationDeliveryStatus === "failed"}
                aria-label={`Failed (${deliveryTriageSummary.failed})`}
                count={deliveryTriageSummary.failed}
                label={`Failed (${deliveryTriageSummary.failed})`}
                onClick={() => {
                  setNotificationStatus("all");
                  setNotificationDeliveryStatus("failed");
                }}
                tone="danger"
              />
              <CountTile
                active={notificationDeliveryStatus === "retryable"}
                aria-label={`Retryable (${deliveryTriageSummary.retryable})`}
                count={deliveryTriageSummary.retryable}
                label={`Retryable (${deliveryTriageSummary.retryable})`}
                onClick={() => {
                  setNotificationStatus("pending");
                  setNotificationDeliveryStatus("retryable");
                }}
                tone="info"
              />
              <div className="basis-full pt-1">
                <Eyebrow>Delivery breakdown</Eyebrow>
              </div>
              <StatusPill dot={false} tone="neutral">
                Not sent {deliveryTriageSummary.not_sent}
              </StatusPill>
              <StatusPill dot={false} tone="success">
                Sent {deliveryTriageSummary.sent}
              </StatusPill>
              <StatusPill dot={false} tone="warning">
                Manual review {deliveryTriageSummary.manual_review}
              </StatusPill>
              <StatusPill dot={false} tone="success">
                Reachable {recipientReadinessSummary.reachable}
              </StatusPill>
              <StatusPill dot={false} tone="warning">
                Missing contact {recipientReadinessSummary.missing}
              </StatusPill>
              <StatusPill dot={false} tone="neutral">
                Attempts {deliveryAttemptSummary.total_attempts}
              </StatusPill>
            </div>
            <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow tone="accent">Provider readiness</Eyebrow>
                <p className="text-sm font-semibold text-theme-text-primary">
                  Visible pending reminders
                </p>
                <p className="mt-1 text-sm text-theme-text-secondary">
                  {deliverableVisibleNotifications.length} ready to send from
                  the current list
                </p>
                <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                  Provider:{" "}
                  {providerStatusQuery.isLoading
                    ? "Loading"
                    : providerStatus?.provider === "webhook"
                      ? "Webhook configured"
                      : "Manual fallback"}
                </p>
                {providerStatus?.provider === "webhook" ? (
                  <p className="mt-1 text-xs text-theme-text-muted">
                    Provider credential{" "}
                    {providerStatus.webhook_secret_configured
                      ? "configured"
                      : "not configured"}
                  </p>
                ) : null}
                {providerStatusQuery.isLoading ? null : (
                  <div className="mt-3 rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3">
                    <p className="text-sm font-semibold text-theme-text-primary">
                      {providerReadinessCopy.label}
                    </p>
                    <p className="mt-1 text-xs text-theme-text-secondary">
                      {providerReadinessCopy.summary}
                    </p>
                    <p className="mt-1 text-xs text-theme-text-secondary">
                      {providerReadinessCopy.action}
                    </p>
                  </div>
                )}
                {sendBulkNotifications.data ? (
                  <p className="mt-2 text-sm font-semibold text-theme-text-secondary">
                    Bulk delivery sent {sendBulkNotifications.data.sent_count}{" "}
                    and failed {sendBulkNotifications.data.failed_count}
                  </p>
                ) : null}
                {sendBulkNotifications.isError ? (
                  <p className="mt-2 text-sm font-semibold text-status-alert-danger-fg">
                    Unable to send visible reminders
                  </p>
                ) : null}
              </div>
              <Button
                disabled={
                  deliverableVisibleNotifications.length === 0 ||
                  sendBulkNotifications.isPending
                }
                onClick={() =>
                  sendBulkNotifications.mutate(
                    deliverableVisibleNotifications.map(
                      (notification) => notification.id,
                    ),
                  )
                }
              >
                {sendBulkNotifications.isPending
                  ? "Sending visible"
                  : "Send visible pending"}
              </Button>
            </Card>
            {notificationsQuery.isLoading ? (
              <EmptyState>Loading notifications</EmptyState>
            ) : visibleNotifications.length === 0 ? (
              <EmptyState>No notifications found</EmptyState>
            ) : (
              visibleNotifications.map((notification) => {
                const retryPolicyState =
                  getNotificationRetryPolicyState(notification);

                return (
                  <article
                    className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
                    key={notification.id}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-theme-text-primary">
                            {notification.title}
                          </h2>
                          <StatusPill tone="neutral">
                            {notification.status}
                          </StatusPill>
                          <StatusPill
                            tone={deliveryTone(notification.delivery_status)}
                          >
                            {getNotificationDeliveryLabel(
                              notification.delivery_status,
                            )}
                          </StatusPill>
                          {retryPolicyState !== "not_applicable" ? (
                            <StatusPill
                              dot={false}
                              tone={
                                retryPolicyState === "manual_review"
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {getNotificationRetryPolicyLabel(
                                retryPolicyState,
                              )}
                            </StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-medium text-theme-text-secondary">
                          {formatType(notification.type)}
                        </p>
                        <p className="mt-1 text-sm text-theme-text-secondary">
                          Due {formatDateTime(notification.due_at)}
                        </p>
                        <p className="mt-1 text-sm text-theme-text-secondary">
                          {notification.customer?.name ??
                            notification.job?.customer?.name ??
                            "No customer"}
                          {notification.job?.location?.address
                            ? ` - ${notification.job.location.address}`
                            : ""}
                        </p>
                        {notification.message ? (
                          <p className="mt-2 text-sm text-theme-text-secondary">
                            {notification.message}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs font-semibold text-theme-text-muted">
                          {recipientLabel(notification)}
                        </p>
                        {notification.delivery_attempts > 0 ? (
                          <p className="mt-2 text-xs font-semibold text-theme-text-muted">
                            Delivery attempts: {notification.delivery_attempts}
                            {notification.last_delivery_attempted_at
                              ? ` | Last attempt ${formatDateTime(notification.last_delivery_attempted_at)}`
                              : ""}
                            {notification.delivered_at
                              ? ` | Sent ${formatDateTime(notification.delivered_at)}`
                              : ""}
                          </p>
                        ) : null}
                        {notification.provider_message_id ? (
                          <p className="mt-1 text-xs font-semibold text-theme-text-muted">
                            Provider message: {notification.provider_message_id}
                          </p>
                        ) : null}
                        {notification.last_delivery_error ? (
                          <p className="mt-2 rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-2 text-xs font-semibold text-status-alert-danger-fg">
                            {notification.last_delivery_error}
                          </p>
                        ) : null}
                      </div>
                      {notification.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          {notification.delivery_status !== "sent" ? (
                            <Button
                              disabled={
                                sendNotification.isPending ||
                                notification.delivery_status === "sending"
                              }
                              onClick={() =>
                                sendNotification.mutate(notification.id)
                              }
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              {notification.delivery_status === "sending"
                                ? "Sending"
                                : "Send"}
                            </Button>
                          ) : null}
                          <Button
                            disabled={markHandled.isPending}
                            onClick={() => markHandled.mutate(notification.id)}
                            size="sm"
                            type="button"
                            variant="subtle"
                          >
                            Mark handled
                          </Button>
                          <Button
                            disabled={dismissNotification.isPending}
                            onClick={() =>
                              dismissNotification.mutate(notification.id)
                            }
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Dismiss
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                aria-label="Search automation rules"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) => setRuleSearch(event.target.value)}
                placeholder="Search rules"
                value={ruleSearch}
              />
              <select
                aria-label="Automation rule status"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setRuleStatus(
                    event.target.value as AutomationRuleStatusFilter,
                  )
                }
                value={ruleStatus}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
            {rulesQuery.isLoading ? (
              <EmptyState>Loading automation rules</EmptyState>
            ) : visibleRules.length === 0 ? (
              <EmptyState>No automation rules found</EmptyState>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {visibleRules.map((rule) => (
                  <article
                    className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
                    key={rule.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-theme-text-primary">
                          {rule.name}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-theme-text-secondary">
                          {formatType(rule.type)}
                        </p>
                      </div>
                      <StatusPill dot={false} tone={ruleStatusTone(rule.status)}>
                        {rule.status}
                      </StatusPill>
                    </div>
                    <p className="mt-3 text-sm text-theme-text-secondary">
                      {rule.offset_days === null
                        ? "No offset"
                        : `${rule.offset_days} days after trigger`}
                    </p>
                    {rule.message ? (
                      <p className="mt-2 text-sm text-theme-text-secondary">
                        {rule.message}
                      </p>
                    ) : null}
                    {rule.template ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                        Template: {rule.template.name}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => editRule(rule)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Edit
                      </Button>
                      {rule.status === "active" ? (
                        <Button
                          onClick={() =>
                            updateRuleStatus.mutate({
                              id: rule.id,
                              status: "paused",
                            })
                          }
                          size="sm"
                          type="button"
                          variant="subtle"
                        >
                          Pause
                        </Button>
                      ) : rule.status === "paused" ? (
                        <Button
                          onClick={() =>
                            updateRuleStatus.mutate({
                              id: rule.id,
                              status: "active",
                            })
                          }
                          size="sm"
                          type="button"
                          variant="subtle"
                        >
                          Resume
                        </Button>
                      ) : null}
                      {rule.status !== "archived" ? (
                        <Button
                          onClick={() =>
                            updateRuleStatus.mutate({
                              id: rule.id,
                              status: "archived",
                            })
                          }
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm">
            <div>
              <Eyebrow>Templates</Eyebrow>
              <h2 className="mt-1 text-xl font-semibold text-theme-text-primary">
                Notification templates
              </h2>
            </div>
            <form className="flex flex-col gap-3" onSubmit={submitTemplate}>
              {templateError ? (
                <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                  {templateError}
                </p>
              ) : null}
              <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
                Template name
                <input
                  aria-label="Template name"
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  value={templateForm.name}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
                Template type
                <select
                  aria-label="Template type"
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      type: event.target.value as AutomationRuleType,
                    }))
                  }
                  value={templateForm.type}
                >
                  <option value="follow_up_reminder">Follow-up reminder</option>
                  <option value="recurring_service_prompt">
                    Recurring service prompt
                  </option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
                Template title
                <input
                  aria-label="Template title"
                  className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  value={templateForm.title}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
                Template message
                <textarea
                  aria-label="Template message"
                  className="min-h-24 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-theme-action-primary"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  value={templateForm.message}
                />
              </label>
              <div
                aria-label="Template preview"
                className="border-l-4 border-theme-action-primary bg-theme-background-subtle p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  Preview
                </p>
                <p
                  aria-label="Template preview title"
                  className="mt-2 text-sm font-semibold text-theme-text-primary"
                >
                  {templatePreview.title || "Title preview"}
                </p>
                <p
                  aria-label="Template preview message"
                  className="mt-1 text-sm text-theme-text-secondary"
                >
                  {templatePreview.message || "Message preview"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    createTemplate.isPending || updateTemplate.isPending
                  }
                  type="submit"
                >
                  {templateForm.id ? "Update template" : "Save template"}
                </Button>
                {templateForm.id ? (
                  <Button
                    onClick={() => setTemplateForm(emptyTemplateForm)}
                    type="button"
                    variant="ghost"
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
              <input
                aria-label="Search templates"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search templates"
                value={templateSearch}
              />
              <select
                aria-label="Template status"
                className="min-h-11 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm shadow-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setTemplateStatus(
                    event.target.value as NotificationTemplateStatusFilter,
                  )
                }
                value={templateStatus}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
            {templatesQuery.isLoading ? (
              <EmptyState>Loading templates</EmptyState>
            ) : visibleTemplates.length === 0 ? (
              <EmptyState>No templates found</EmptyState>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleTemplates.map((template) => (
                  <article
                    className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3"
                    key={template.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-theme-text-primary">
                          {template.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-theme-text-secondary">
                          {formatType(template.type)}
                        </p>
                      </div>
                      <StatusPill
                        dot={false}
                        tone={template.status === "active" ? "success" : "neutral"}
                      >
                        {template.status}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm font-medium text-theme-text-primary">
                      {template.title}
                    </p>
                    {template.message ? (
                      <p className="mt-1 text-sm text-theme-text-secondary">
                        {template.message}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.status === "active" ? (
                        <Button
                          onClick={() => applyTemplate(template)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Use
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => editTemplate(template)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Edit
                      </Button>
                      {template.status === "active" ? (
                        <Button
                          disabled={archiveTemplate.isPending}
                          onClick={() => archiveTemplate.mutate(template.id)}
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          Archive
                        </Button>
                      ) : (
                        <Button
                          disabled={restoreTemplate.isPending}
                          onClick={() => restoreTemplate.mutate(template.id)}
                          size="sm"
                          type="button"
                          variant="subtle"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <form
            className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitNotification}
          >
            <h2 className="text-xl font-semibold text-theme-text-primary">
              Create reminder
            </h2>
            {notificationError ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                {notificationError}
              </p>
            ) : null}
            <SearchableSelect
              ariaLabel="Reminder template"
              emptyMessage="No templates found"
              label="Template"
              onChange={(templateId) => {
                const template = activeTemplates.find(
                  (item) => item.id === templateId,
                );

                if (template) {
                  applyTemplate(template);
                } else {
                  setNotificationForm((current) => ({
                    ...current,
                    template_id: "",
                  }));
                }
              }}
              options={reminderTemplateOptions}
              value={notificationForm.template_id}
            />
            <SearchableSelect
              ariaLabel="Reminder rule"
              emptyMessage="No active rules found"
              label="Rule"
              onChange={(ruleId) =>
                setNotificationForm((current) => ({
                  ...current,
                  rule_id: ruleId,
                }))
              }
              options={reminderRuleOptions}
              value={notificationForm.rule_id}
            />
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Type
              <select
                aria-label="Reminder type"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationForm((current) => ({
                    ...current,
                    type: event.target.value as AutomationRuleType,
                  }))
                }
                value={notificationForm.type}
              >
                <option value="follow_up_reminder">Follow-up reminder</option>
                <option value="recurring_service_prompt">
                  Recurring service prompt
                </option>
              </select>
            </label>
            <SearchableSelect
              ariaLabel="Reminder customer"
              emptyMessage="No customers found"
              label="Customer"
              onChange={(customerId) =>
                setNotificationForm((current) => ({
                  ...current,
                  customer_id: customerId,
                }))
              }
              options={reminderCustomerOptions}
              value={notificationForm.customer_id}
            />
            <SearchableSelect
              ariaLabel="Reminder job"
              emptyMessage="No jobs found"
              label="Job"
              onChange={(jobId) =>
                setNotificationForm((current) => ({
                  ...current,
                  job_id: jobId,
                }))
              }
              options={reminderJobOptions}
              value={notificationForm.job_id}
            />
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Title
              <input
                aria-label="Reminder title"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                value={notificationForm.title}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Due
              <input
                aria-label="Reminder due"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationForm((current) => ({
                    ...current,
                    due_at: event.target.value,
                  }))
                }
                type="datetime-local"
                value={notificationForm.due_at}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Message
              <textarea
                aria-label="Reminder message"
                className="min-h-24 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setNotificationForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                value={notificationForm.message}
              />
            </label>
            <div
              aria-label="Reminder preview"
              className="border-l-4 border-theme-action-primary bg-theme-background-subtle p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                Preview
              </p>
              <p
                aria-label="Reminder preview title"
                className="mt-2 text-sm font-semibold text-theme-text-primary"
              >
                {notificationPreview.title || "Title preview"}
              </p>
              <p
                aria-label="Reminder preview message"
                className="mt-1 text-sm text-theme-text-secondary"
              >
                {notificationPreview.message || "Message preview"}
              </p>
            </div>
            <Button
              disabled={createNotification.isPending}
              type="submit"
            >
              Save reminder
            </Button>
          </form>

          <form
            className="flex h-fit flex-col gap-4 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 shadow-sm"
            onSubmit={submitRule}
          >
            <h2 className="text-xl font-semibold text-theme-text-primary">
              {ruleForm.id ? "Edit rule" : "Create rule"}
            </h2>
            {ruleError ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg p-3 text-sm text-status-alert-danger-fg">
                {ruleError}
              </p>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Name
              <input
                aria-label="Rule name"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={ruleForm.name}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Type
              <select
                aria-label="Rule type"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    template_id: "",
                    type: event.target.value as AutomationRuleType,
                  }))
                }
                value={ruleForm.type}
              >
                <option value="follow_up_reminder">Follow-up reminder</option>
                <option value="recurring_service_prompt">
                  Recurring service prompt
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Rule template
              <select
                aria-label="Rule template"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    template_id: event.target.value,
                  }))
                }
                value={ruleForm.template_id}
              >
                <option value="">No template</option>
                {matchingRuleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Offset days
              <input
                aria-label="Offset days"
                className="min-h-11 rounded-md border border-theme-border-default px-3 text-sm outline-none focus:border-theme-action-primary"
                min="0"
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    offset_days: event.target.value,
                  }))
                }
                type="number"
                value={ruleForm.offset_days}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-theme-text-primary">
              Message
              <textarea
                aria-label="Rule message"
                className="min-h-24 rounded-md border border-theme-border-default px-3 py-2 text-sm outline-none focus:border-theme-action-primary"
                onChange={(event) =>
                  setRuleForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                value={ruleForm.message}
              />
            </label>
            <Button
              disabled={createRule.isPending || updateRule.isPending}
              type="submit"
            >
              {ruleForm.id ? "Update rule" : "Save rule"}
            </Button>
            {ruleForm.id ? (
              <Button
                onClick={() => setRuleForm(emptyRuleForm)}
                type="button"
                variant="ghost"
              >
                Cancel rule edit
              </Button>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
