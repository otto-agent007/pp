import { describe, expect, it } from "vitest";
import type {
  AutomationRule,
  NotificationEvent,
  NotificationTemplate,
} from "@pest-patrol/types";

import {
  buildAutomationSchedulerPlan,
  buildAutomationSchedulerPreview,
  buildNotificationDeliveryProviderPayload,
  filterAutomationRules,
  filterNotificationEvents,
  filterNotificationEventsByRecipient,
  filterNotificationTemplates,
  getAutomationSummary,
  getAutomationSchedulerStatus,
  getNotificationDeliveryAttemptSummary,
  getNotificationDeliveryLabel,
  getNotificationDeliveryTriageSummary,
  getNotificationRetryPolicyLabel,
  getNotificationRetryPolicyState,
  getNotificationRecipientReadiness,
  getNotificationRecipientReadinessSummary,
  getPendingDeliverableNotifications,
  interpolateNotificationTemplateText,
  normalizeAutomationRuleInput,
  normalizeNotificationEventInput,
  normalizeNotificationTemplateInput,
  previewNotificationTemplateCopy,
  statusForAutomationRule,
  validateNotificationEventId,
} from "./automation";

const now = "2026-05-06T12:00:00.000Z";
const rule: AutomationRule = {
  id: "rule-1",
  name: "Post-service follow-up",
  type: "follow_up_reminder",
  status: "active",
  template_id: null,
  offset_days: 2,
  message: "Check satisfaction",
  template: null,
  created_at: now,
  updated_at: now,
};
const notification: NotificationEvent = {
  id: "notification-1",
  rule_id: "rule-1",
  type: "follow_up_reminder",
  generated_key: null,
  customer_id: "customer-1",
  job_id: "job-1",
  status: "pending",
  title: "Call Apex",
  message: "Ask about the treatment",
  due_at: "2026-05-05T12:00:00.000Z",
  handled_at: null,
  delivery_status: "not_sent",
  delivery_provider: null,
  provider_message_id: null,
  delivery_attempts: 0,
  last_delivery_attempted_at: null,
  delivered_at: null,
  last_delivery_error: null,
  created_at: now,
  updated_at: now,
  customer: {
    id: "customer-1",
    name: "Apex Homes",
    phone: null,
    email: null,
    property_type: "residential",
    service_notes: null,
    status: "active",
    created_at: now,
    updated_at: now,
  },
};
const arrivalNotification: NotificationEvent = {
  ...notification,
  id: "notification-arrival",
  customer_id: null,
  rule_id: null,
  type: "arrival_notification",
  generated_key: "arrival-notice:job-1:00000000-0000-4000-8000-000000000201",
  status: "dismissed",
  handled_at: now,
  title: "Arrived on site",
  rule: null,
};
const template: NotificationTemplate = {
  id: "template-1",
  name: "Follow-up call",
  type: "follow_up_reminder",
  status: "active",
  title: "Call customer",
  message: "Ask how the service went",
  created_at: now,
  updated_at: now,
};
const variableTemplate: NotificationTemplate = {
  ...template,
  id: "template-variables",
  title: "Call {{ customer.name }}",
  message: "Ask about {{location.address}} from {{service.date}}",
};

describe("automation domain", () => {
  it("normalizes automation rule inputs", () => {
    expect(
      normalizeAutomationRuleInput({
        name: " Follow up ",
        type: "follow_up_reminder",
        offset_days: 3,
        message: " Call ",
      }),
    ).toEqual({
      name: "Follow up",
      type: "follow_up_reminder",
      template_id: null,
      offset_days: 3,
      message: "Call",
    });
  });

  it("rejects invalid rule inputs", () => {
    expect(() =>
      normalizeAutomationRuleInput({
        name: "",
        type: "follow_up_reminder",
      }),
    ).toThrow("Rule name is required");

    expect(() =>
      normalizeAutomationRuleInput({
        name: "Bad offset",
        type: "recurring_service_prompt",
        offset_days: -1,
      }),
    ).toThrow("Offset days must be zero or greater");
  });

  it("normalizes notification inputs and requires a target", () => {
    expect(
      normalizeNotificationEventInput({
        type: "follow_up_reminder",
        customer_id: " customer-1 ",
        title: " Call ",
        due_at: now,
      }),
    ).toMatchObject({
      customer_id: "customer-1",
      title: "Call",
    });
    expect(
      normalizeNotificationEventInput({
        type: "arrival_notification",
        job_id: "job-1",
        title: " Arrival notice ",
        due_at: now,
        status: "dismissed",
      }),
    ).toMatchObject({
      job_id: "job-1",
      status: "dismissed",
      title: "Arrival notice",
      type: "arrival_notification",
    });

    expect(() =>
      normalizeNotificationEventInput({
        type: "follow_up_reminder",
        title: "Call",
        due_at: now,
      }),
    ).toThrow("Customer or job is required");
  });

  it("normalizes and filters notification templates", () => {
    expect(
      normalizeNotificationTemplateInput({
        name: " Follow-up ",
        type: "follow_up_reminder",
        title: " Call ",
        message: " Ask ",
      }),
    ).toEqual({
      name: "Follow-up",
      type: "follow_up_reminder",
      title: "Call",
      message: "Ask",
    });
    expect(() =>
      normalizeNotificationTemplateInput({
        name: "",
        type: "follow_up_reminder",
        title: "Call",
      }),
    ).toThrow("Template name is required");
    expect(filterNotificationTemplates([template], "call", "active")).toEqual([
      template,
    ]);
    expect(filterNotificationTemplates([template], "call", "archived")).toEqual(
      [],
    );
  });

  it("previews notification template variables with safe fallbacks", () => {
    const context = {
      job: {
        scheduled_start: "2026-05-01T12:00:00.000Z",
        scheduled_end: null,
        customer: { name: "Apex Homes" },
        location: {
          address: "10 Pine Street",
          nickname: null,
        },
      },
    };

    expect(
      previewNotificationTemplateCopy({
        context,
        title: "Follow up with {{customer.name}}",
        message: "Visit {{location.nickname}} on {{service.date}}",
      }),
    ).toEqual({
      title: "Follow up with Apex Homes",
      message: "Visit 10 Pine Street on May 1, 2026",
    });
    expect(
      interpolateNotificationTemplateText(
        "{{customer.name}} {{location.address}} {{service.date}} {{bad.value}}",
      ),
    ).toBe("customer service location service date {{bad.value}}");
  });

  it("filters rules and notifications", () => {
    expect(filterAutomationRules([rule], "post", "active")).toEqual([rule]);
    expect(filterAutomationRules([rule], "missing", "active")).toEqual([]);
    expect(filterNotificationEvents([notification], "apex", "pending")).toEqual([
      notification,
    ]);
    expect(
      filterNotificationEvents(
        [
          notification,
          {
            ...notification,
            id: "notification-failed",
            delivery_status: "failed",
          },
        ],
        "",
        "pending",
        "failed",
      ),
    ).toEqual([
      {
        ...notification,
        id: "notification-failed",
        delivery_status: "failed",
      },
    ]);
    expect(
      filterNotificationEvents(
        [
          notification,
          {
            ...notification,
            id: "notification-sent",
            delivery_status: "sent",
          },
        ],
        "",
        "pending",
        "retryable",
      ),
    ).toEqual([notification]);
  });

  it("summarizes automation state", () => {
    expect(
      getAutomationSummary(
        [
          rule,
          {
            ...rule,
            id: "rule-2",
            type: "recurring_service_prompt",
          },
        ],
        [notification],
        now,
      ),
    ).toEqual({
      activeRules: 2,
      failedDeliveries: 0,
      overdueNotifications: 1,
      pendingNotifications: 1,
      recurringRules: 1,
    });
  });

  it("validates rule statuses", () => {
    expect(statusForAutomationRule("paused")).toBe("paused");
    expect(() => statusForAutomationRule("bad" as never)).toThrow(
      "Automation rule status is invalid",
    );
  });

  it("labels delivery statuses and validates notification ids", () => {
    expect(getNotificationDeliveryLabel("not_sent")).toBe("Not sent");
    expect(getNotificationDeliveryLabel("sending")).toBe("Sending");
    expect(getNotificationDeliveryLabel("sent")).toBe("Sent");
    expect(getNotificationDeliveryLabel("failed")).toBe("Failed");
    expect(validateNotificationEventId(" notification-1 ")).toBe(
      "notification-1",
    );
    expect(() => validateNotificationEventId(" ")).toThrow(
      "Notification is required",
    );
  });

  it("classifies notification retry policy states", () => {
    expect(getNotificationRetryPolicyState(notification)).toBe("retryable");
    expect(getNotificationRetryPolicyLabel("retryable")).toBe("Retryable");
    expect(
      getNotificationRetryPolicyState({
        ...notification,
        delivery_status: "failed",
        delivery_attempts: 2,
      }),
    ).toBe("retryable");
    expect(
      getNotificationRetryPolicyState({
        ...notification,
        delivery_status: "failed",
        delivery_attempts: 3,
      }),
    ).toBe("manual_review");
    expect(getNotificationRetryPolicyLabel("manual_review")).toBe(
      "Manual review",
    );
    expect(
      getNotificationRetryPolicyState({
        ...notification,
        delivery_status: "sent",
      }),
    ).toBe("not_applicable");
    expect(
      getNotificationRetryPolicyState({
        ...notification,
        delivery_status: "sending",
      }),
    ).toBe("not_applicable");
    expect(
      getNotificationRetryPolicyState({
        ...notification,
        status: "handled",
      }),
    ).toBe("not_applicable");
  });

  it("selects pending deliverable notifications for bulk delivery", () => {
    expect(
      getPendingDeliverableNotifications([
        notification,
        {
          ...notification,
          id: "notification-sent",
          delivery_status: "sent",
        },
        {
          ...notification,
          id: "notification-sending",
          delivery_status: "sending",
        },
        {
          ...notification,
          id: "notification-failed",
          delivery_status: "failed",
        },
        {
          ...notification,
          id: "notification-manual-review",
          delivery_attempts: 3,
          delivery_status: "failed",
        },
        {
          ...notification,
          id: "notification-handled",
          status: "handled",
        },
      ]),
    ).toEqual([
      notification,
      {
        ...notification,
        id: "notification-failed",
        delivery_status: "failed",
      },
    ]);
  });

  it("summarizes delivery triage counts", () => {
    expect(
      getNotificationDeliveryTriageSummary([
        notification,
        {
          ...notification,
          id: "notification-failed",
          delivery_status: "failed",
        },
        {
          ...notification,
          id: "notification-sent",
          delivery_status: "sent",
        },
        {
          ...notification,
          id: "notification-manual-review",
          delivery_attempts: 3,
          delivery_status: "failed",
        },
      ]),
    ).toEqual({
      failed: 2,
      manual_review: 1,
      not_sent: 1,
      retryable: 2,
      sent: 1,
    });
  });

  it("summarizes notification recipient readiness from direct customers", () => {
    expect(
      getNotificationRecipientReadiness({
        ...notification,
        customer: {
          ...notification.customer!,
          email: " office@apex.example ",
          phone: "",
        },
      }),
    ).toEqual({
      customer_id: "customer-1",
      customer_name: "Apex Homes",
      email: "office@apex.example",
      has_email: true,
      has_phone: false,
      is_reachable: true,
      phone: null,
    });
  });

  it("summarizes notification recipient readiness from job customers", () => {
    expect(
      getNotificationRecipientReadiness({
        ...notification,
        customer: null,
        customer_id: null,
        job: {
          id: "job-1",
          customer_id: "customer-1",
          location_id: "location-1",
          assigned_tech_id: null,
          status: "completed",
          scheduled_start: "2026-05-01T12:00:00.000Z",
          scheduled_end: null,
          service_notes: null,
          created_at: now,
          updated_at: now,
          customer: {
            ...notification.customer!,
            email: null,
            phone: "555-0100",
          },
        },
      }),
    ).toMatchObject({
      customer_id: "customer-1",
      email: null,
      has_email: false,
      has_phone: true,
      is_reachable: true,
      phone: "555-0100",
    });
  });

  it("reports missing notification recipient contact", () => {
    expect(
      getNotificationRecipientReadiness({
        ...notification,
        customer: null,
        customer_id: null,
        job: null,
        job_id: "job-1",
      }),
    ).toEqual({
      customer_id: null,
      customer_name: null,
      email: null,
      has_email: false,
      has_phone: false,
      is_reachable: false,
      phone: null,
    });
  });

  it("summarizes and filters notification recipient readiness", () => {
    const emailReady = {
      ...notification,
      id: "notification-email",
      customer: {
        ...notification.customer!,
        email: "office@apex.example",
        phone: null,
      },
    };
    const phoneReady = {
      ...notification,
      id: "notification-phone",
      customer: {
        ...notification.customer!,
        email: null,
        phone: "555-0100",
      },
    };
    const missing = {
      ...notification,
      id: "notification-missing",
      customer: {
        ...notification.customer!,
        email: null,
        phone: null,
      },
    };

    expect(
      getNotificationRecipientReadinessSummary([
        emailReady,
        phoneReady,
        missing,
      ]),
    ).toEqual({
      email_ready: 1,
      missing: 1,
      phone_ready: 1,
      reachable: 2,
    });
    expect(
      filterNotificationEventsByRecipient(
        [emailReady, phoneReady, missing],
        "reachable",
      ).map((item) => item.id),
    ).toEqual(["notification-email", "notification-phone"]);
    expect(
      filterNotificationEventsByRecipient(
        [emailReady, phoneReady, missing],
        "missing",
      ),
    ).toEqual([missing]);
  });

  it("summarizes notification delivery attempts", () => {
    expect(
      getNotificationDeliveryAttemptSummary([
        notification,
        {
          ...notification,
          id: "notification-attempted",
          delivery_attempts: 2,
          last_delivery_attempted_at: "2026-05-06T13:00:00.000Z",
        },
        {
          ...notification,
          id: "notification-latest",
          delivery_attempts: 1,
          last_delivery_attempted_at: "2026-05-06T14:00:00.000Z",
        },
      ]),
    ).toEqual({
      attempted: 2,
      latest_attempted_at: "2026-05-06T14:00:00.000Z",
      never_attempted: 1,
      total_attempts: 3,
    });
  });

  it("builds sanitized notification provider payloads", () => {
    expect(
      buildNotificationDeliveryProviderPayload({
        ...notification,
        customer: {
          ...notification.customer!,
          email: "office@apex.example",
          phone: "555-0100",
          service_notes: "Internal note",
        },
        job: {
          id: "job-1",
          customer_id: "customer-1",
          location_id: "location-1",
          assigned_tech_id: null,
          status: "completed",
          scheduled_start: "2026-05-01T12:00:00.000Z",
          scheduled_end: null,
          service_notes: "Internal job note",
          created_at: now,
          updated_at: now,
          customer: {
            ...notification.customer!,
            email: "office@apex.example",
            phone: "555-0100",
          },
          location: {
            id: "location-1",
            customer_id: "customer-1",
            address: "10 Pine Street",
            nickname: "Main office",
            service_notes: "Gate code",
            is_primary: true,
            status: "active",
            created_at: now,
            updated_at: now,
          },
        },
      }),
    ).toEqual({
      event: {
        id: "notification-1",
        type: "follow_up_reminder",
        title: "Call Apex",
        message: "Ask about the treatment",
        due_at: "2026-05-05T12:00:00.000Z",
        status: "pending",
        delivery_status: "not_sent",
        customer_id: "customer-1",
        job_id: "job-1",
        generated_key: null,
      },
      target: {
        customer_id: "customer-1",
        job_id: "job-1",
        location_id: "location-1",
      },
      customer: {
        id: "customer-1",
        name: "Apex Homes",
        email: "office@apex.example",
        phone: "555-0100",
      },
      job: {
        id: "job-1",
        status: "completed",
        scheduled_start: "2026-05-01T12:00:00.000Z",
        scheduled_end: null,
      },
      location: {
        id: "location-1",
        address: "10 Pine Street",
        nickname: "Main office",
      },
    });
    expect(
      buildNotificationDeliveryProviderPayload({
        ...arrivalNotification,
        customer: undefined,
        job: undefined,
      }),
    ).toMatchObject({
      event: {
        id: "notification-arrival",
        type: "arrival_notification",
        status: "dismissed",
      },
      target: {
        customer_id: null,
        job_id: "job-1",
      },
    });
  });

  it("builds notification provider payloads without optional context", () => {
    expect(
      buildNotificationDeliveryProviderPayload({
        ...notification,
        customer: undefined,
        customer_id: null,
        job: undefined,
        job_id: "job-1",
      }),
    ).toMatchObject({
      customer: null,
      job: null,
      location: null,
      target: {
        customer_id: null,
        job_id: "job-1",
        location_id: null,
      },
    });
  });

  it("builds due scheduler notifications and skips inactive rules", () => {
    const job = {
      id: "job-1",
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: null,
      status: "completed",
      scheduled_start: "2026-05-01T12:00:00.000Z",
      scheduled_end: null,
      service_notes: null,
      created_at: now,
      updated_at: now,
      customer: {
        id: "customer-1",
        name: "Apex Homes",
        phone: null,
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      location: {
        id: "location-1",
        customer_id: "customer-1",
        address: "10 Pine Street",
        nickname: null,
        service_notes: null,
        is_primary: true,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    } as const;

    const plan = buildAutomationSchedulerPlan({
      jobs: [job],
      now,
      rules: [
        {
          ...rule,
          template_id: "template-variables",
          template: variableTemplate,
        },
        {
          ...rule,
          id: "rule-2",
          type: "recurring_service_prompt",
        },
        {
          ...rule,
          id: "rule-3",
          status: "paused",
        },
      ],
    });

    expect(plan.evaluated_jobs).toBe(1);
    expect(plan.evaluated_rules).toBe(2);
    expect(plan.notifications).toHaveLength(2);
    expect(plan.notifications.map((item) => item.generated_key)).toEqual([
      "automation:rule-1:follow_up:job-1",
      "automation:rule-2:recurring:customer-1:2026-05-03",
    ]);
    expect(plan.notifications[0]).toMatchObject({
      title: "Call Apex Homes",
      message: "Ask about 10 Pine Street from May 1, 2026",
    });
    expect(plan.notifications[1]).toMatchObject({
      title: "Schedule recurring service for Apex Homes",
      message: "Check satisfaction",
    });
  });

  it("previews due scheduler notifications and labels duplicates", () => {
    const job = {
      id: "job-1",
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: null,
      status: "completed",
      scheduled_start: "2026-05-01T12:00:00.000Z",
      scheduled_end: null,
      service_notes: null,
      created_at: now,
      updated_at: now,
      customer: {
        id: "customer-1",
        name: "Apex Homes",
        phone: null,
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      location: {
        id: "location-1",
        customer_id: "customer-1",
        address: "10 Pine Street",
        nickname: null,
        service_notes: null,
        is_primary: true,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    } as const;

    const preview = buildAutomationSchedulerPreview({
      existingNotifications: [
        {
          ...notification,
          generated_key: "automation:rule-1:follow_up:job-1",
        },
      ],
      jobs: [job],
      now,
      rules: [
        {
          ...rule,
          template_id: "template-variables",
          template: variableTemplate,
        },
      ],
    });

    expect(preview.evaluated_jobs).toBe(1);
    expect(preview.evaluated_rules).toBe(1);
    expect(preview.duplicate_count).toBe(1);
    expect(preview.items[0]).toMatchObject({
      is_duplicate: true,
      notification: {
        generated_key: "automation:rule-1:follow_up:job-1",
        title: "Call Apex Homes",
        message: "Ask about 10 Pine Street from May 1, 2026",
      },
    });
  });

  it("summarizes scheduler status from runs and generated notifications", () => {
    const generatedNotification = {
      ...notification,
      id: "notification-generated",
      generated_key: "automation:rule-1:follow_up:job-1",
      created_at: "2026-05-06T13:00:00.000Z",
    };

    expect(
      getAutomationSchedulerStatus({
        notifications: [notification, generatedNotification],
        runs: [
          {
            id: "run-1",
            status: "success",
            triggered_by: "manual",
            triggered_by_user_id: "admin-1",
            started_at: "2026-05-06T12:00:00.000Z",
            finished_at: "2026-05-06T12:00:01.000Z",
            created_count: 1,
            skipped_duplicate_count: 2,
            evaluated_rule_count: 1,
            evaluated_job_count: 3,
            error_message: null,
          },
        ],
      }),
    ).toMatchObject({
      generatedNotifications: [generatedNotification],
      lastRunGeneratedCount: 1,
      lastRunSkippedDuplicateCount: 2,
      lastRunStatus: "success",
    });
  });
});
