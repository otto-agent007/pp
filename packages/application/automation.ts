import type { AutomationPort } from "./ports";
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

export async function listAutomationRules(port: AutomationPort) {
  return port.listAutomationRuleRecords();
}

export async function listAutomationSchedulerRuns(port: AutomationPort) {
  return port.listAutomationSchedulerRunRecords();
}

export async function createAutomationRule(port: AutomationPort, input: AutomationRuleInput) {
  return port.createAutomationRuleRecord(validateAutomationRuleInput(input));
}

export async function updateAutomationRule(
  port: AutomationPort, id: string,
  input: AutomationRuleInput,
) {
  return port.updateAutomationRuleRecord(
    requireNonEmpty(id, "Automation rule"),
    validateAutomationRuleInput(input),
  );
}

export async function updateAutomationRuleStatus(
  port: AutomationPort, id: string,
  status: AutomationRuleStatus,
) {
  return port.updateAutomationRuleStatusRecord(
    requireNonEmpty(id, "Automation rule"),
    statusForAutomationRule(status),
  );
}

export async function listNotificationEvents(port: AutomationPort) {
  return port.listNotificationEventRecords();
}

export async function listNotificationTemplates(port: AutomationPort) {
  return port.listNotificationTemplateRecords();
}

export async function createNotificationTemplate(
  port: AutomationPort, input: NotificationTemplateInput,
) {
  return port.createNotificationTemplateRecord(
    validateNotificationTemplateInput(input),
  );
}

export async function updateNotificationTemplate(
  port: AutomationPort, id: string,
  input: NotificationTemplateInput,
) {
  return port.updateNotificationTemplateRecord(
    requireNonEmpty(id, "Notification template"),
    validateNotificationTemplateInput(input),
  );
}

export async function archiveNotificationTemplate(port: AutomationPort, id: string) {
  return port.updateNotificationTemplateStatusRecord(
    requireNonEmpty(id, "Notification template"),
    "archived",
  );
}

export async function restoreNotificationTemplate(port: AutomationPort, id: string) {
  return port.updateNotificationTemplateStatusRecord(
    requireNonEmpty(id, "Notification template"),
    "active",
  );
}

export async function createNotificationEvent(port: AutomationPort, input: NotificationEventInput) {
  return port.createNotificationEventRecord(validateNotificationEventInput(input));
}

export async function markNotificationEventHandled(port: AutomationPort, id: string) {
  return port.markNotificationEventHandledRecord(validateNotificationEventId(id));
}

export async function dismissNotificationEvent(port: AutomationPort, id: string) {
  return port.dismissNotificationEventRecord(validateNotificationEventId(id));
}

export async function sendNotificationEventDelivery(port: AutomationPort, id: string) {
  return port.sendNotificationEventDeliveryRecord(validateNotificationEventId(id));
}

export async function getNotificationProviderStatus(port: AutomationPort) {
  return port.getNotificationProviderStatusRecord();
}

export async function sendNotificationEventDeliveries(
  port: AutomationPort, ids: string[],
): Promise<NotificationBulkDeliveryResult> {
  const normalizedIds = ids.map((id) => validateNotificationEventId(id));

  if (normalizedIds.length === 0) {
    return {
      failed_count: 0,
      results: [],
      sent_count: 0,
    };
  }

  return port.sendNotificationEventDeliveriesRecord(normalizedIds);
}

export async function runAutomationSchedulerManual(port: AutomationPort) {
  return port.runAutomationSchedulerManualRecord();
}

export async function runAutomationSchedulerForClient(
  port: AutomationPort,
  now = new Date().toISOString(),
): Promise<AutomationSchedulerResult> {
  const [rules, jobs] = await Promise.all([
    port.listAutomationRuleRecords(),
    port.listAutomationSchedulerJobRecords(),
  ]);
  const plan = buildAutomationSchedulerPlan({ jobs, now, rules });
  let created = 0;
  let skippedDuplicates = 0;

  for (const notification of plan.notifications) {
    const event = await port.createGeneratedNotificationEventRecord(notification);

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
