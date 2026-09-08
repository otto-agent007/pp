import {
  createAutomationRuleRecord,
  createGeneratedNotificationEventRecord,
  createNotificationEventRecord,
  createNotificationTemplateRecord,
  dismissNotificationEventRecord,
  getNotificationProviderStatusRecord,
  listAutomationRuleRecords,
  listAutomationSchedulerJobRecords,
  listAutomationSchedulerRunRecords,
  listNotificationEventRecords,
  listNotificationTemplateRecords,
  markNotificationEventHandledRecord,
  runAutomationSchedulerManualRecord,
  sendNotificationEventDeliveriesRecord,
  sendNotificationEventDeliveryRecord,
  updateAutomationRuleRecord,
  updateAutomationRuleStatusRecord,
  updateNotificationTemplateRecord,
  updateNotificationTemplateStatusRecord,
} from "@pest-patrol/api-client";
import type {
  AutomationRuleInput,
  AutomationRuleStatus,
  AutomationSchedulerResult,
  NotificationEventInput,
  NotificationTemplateInput,
} from "@pest-patrol/types";
import {
  NotificationBulkDeliveryResult,
  buildAutomationSchedulerPlan,
  requireNonEmpty,
  statusForAutomationRule,
  validateAutomationRuleInput,
  validateNotificationEventId,
  validateNotificationEventInput,
  validateNotificationTemplateInput,
} from "@pest-patrol/domain";

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
