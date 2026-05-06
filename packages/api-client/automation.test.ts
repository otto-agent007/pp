import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAutomationRuleRecord,
  createAutomationSchedulerRunRecord,
  createGeneratedNotificationEventRecord,
  createNotificationEventRecord,
  createNotificationTemplateRecord,
  dismissNotificationEventRecord,
  getNotificationProviderStatusRecord,
  listAutomationRuleRecords,
  listNotificationEventRecords,
  markNotificationEventHandledRecord,
  sendNotificationEventDeliveryRecord,
  listAutomationSchedulerJobRecords,
  listAutomationSchedulerRunRecords,
  listNotificationTemplateRecords,
  runAutomationSchedulerManualRecord,
  sendNotificationEventDeliveriesRecord,
  updateAutomationRuleRecord,
  updateAutomationRuleStatusRecord,
  updateNotificationTemplateRecord,
  updateNotificationTemplateStatusRecord,
} from "./automation";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-06T12:00:00.000Z";
const rule = {
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
const notification = {
  id: "notification-1",
  rule_id: "rule-1",
  type: "follow_up_reminder",
  generated_key: null,
  customer_id: "customer-1",
  job_id: null,
  status: "pending",
  title: "Call Apex",
  message: "Check satisfaction",
  due_at: now,
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
};
const template = {
  id: "template-1",
  name: "Follow-up call",
  type: "follow_up_reminder",
  status: "active",
  title: "Call customer",
  message: "Ask how the service went",
  created_at: now,
  updated_at: now,
};
const schedulerRun = {
  id: "run-1",
  status: "success",
  triggered_by: "manual",
  triggered_by_user_id: "admin-1",
  started_at: now,
  finished_at: now,
  created_count: 2,
  skipped_duplicate_count: 1,
  evaluated_rule_count: 1,
  evaluated_job_count: 3,
  error_message: null,
};

describe("automation api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
    vi.unstubAllGlobals();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
  });

  it("lists and creates automation rules", async () => {
    const listQuery = new MockQuery({ data: [rule], error: null });
    const createQuery = new MockQuery({ data: rule, error: null });
    from.mockReturnValueOnce(listQuery as never).mockReturnValueOnce(createQuery as never);

    const rules = await listAutomationRuleRecords();
    await createAutomationRuleRecord({
      name: "Post-service follow-up",
      type: "follow_up_reminder",
      offset_days: 2,
      message: "Check satisfaction",
    });

    expect(rules).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("automation_rules");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          name: "Post-service follow-up",
          status: "active",
        }),
      ],
    ]);
  });

  it("updates automation rules and status", async () => {
    const fullUpdateQuery = new MockQuery({
      data: { ...rule, template_id: "template-1", template },
      error: null,
    });
    const updateQuery = new MockQuery({
      data: { ...rule, status: "paused" },
      error: null,
    });
    from
      .mockReturnValueOnce(fullUpdateQuery as never)
      .mockReturnValueOnce(updateQuery as never);

    const fullUpdate = await updateAutomationRuleRecord("rule-1", {
      name: "Post-service follow-up",
      type: "follow_up_reminder",
      template_id: "template-1",
      offset_days: 2,
      message: "Check satisfaction",
    });
    const updated = await updateAutomationRuleStatusRecord("rule-1", "paused");

    expect(fullUpdate.template_id).toBe("template-1");
    expect(fullUpdateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          template_id: "template-1",
        }),
      ],
    ]);
    expect(updated.status).toBe("paused");
    expect(updateQuery.calls[0]).toEqual(["update", [{ status: "paused" }]]);
  });

  it("lists and creates notification events", async () => {
    const listQuery = new MockQuery({ data: [notification], error: null });
    const createQuery = new MockQuery({ data: notification, error: null });
    from.mockReturnValueOnce(listQuery as never).mockReturnValueOnce(createQuery as never);

    const notifications = await listNotificationEventRecords();
    await createNotificationEventRecord({
      rule_id: "rule-1",
      type: "follow_up_reminder",
      customer_id: "customer-1",
      title: "Call Apex",
      due_at: now,
    });

    expect(notifications).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("notification_events");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          customer_id: "customer-1",
          status: "pending",
        }),
      ],
    ]);
  });

  it("lists, creates, updates, and archives notification templates", async () => {
    const listQuery = new MockQuery({ data: [template], error: null });
    const createQuery = new MockQuery({ data: template, error: null });
    const updateQuery = new MockQuery({
      data: { ...template, title: "Updated title" },
      error: null,
    });
    const archiveQuery = new MockQuery({
      data: { ...template, status: "archived" },
      error: null,
    });
    from
      .mockReturnValueOnce(listQuery as never)
      .mockReturnValueOnce(createQuery as never)
      .mockReturnValueOnce(updateQuery as never)
      .mockReturnValueOnce(archiveQuery as never);

    const templates = await listNotificationTemplateRecords();
    await createNotificationTemplateRecord({
      name: "Follow-up call",
      type: "follow_up_reminder",
      title: "Call customer",
      message: "Ask how the service went",
    });
    await updateNotificationTemplateRecord("template-1", {
      name: "Follow-up call",
      type: "follow_up_reminder",
      title: "Updated title",
      message: "Ask how the service went",
    });
    const archived = await updateNotificationTemplateStatusRecord(
      "template-1",
      "archived",
    );

    expect(templates).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("notification_templates");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          name: "Follow-up call",
          status: "active",
          title: "Call customer",
        }),
      ],
    ]);
    expect(updateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          title: "Updated title",
        }),
      ],
    ]);
    expect(archiveQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          status: "archived",
        }),
      ],
    ]);
    expect(archived.status).toBe("archived");
  });

  it("lists completed scheduler jobs", async () => {
    const listQuery = new MockQuery({ data: [], error: null });
    from.mockReturnValue(listQuery as never);

    const jobs = await listAutomationSchedulerJobRecords();

    expect(jobs).toEqual([]);
    expect(from).toHaveBeenCalledWith("jobs");
    expect(listQuery.calls).toContainEqual(["eq", ["status", "completed"]]);
  });

  it("lists and creates scheduler run records", async () => {
    const run = {
      id: "run-1",
      status: "success",
      triggered_by: "cron",
      triggered_by_user_id: null,
      started_at: now,
      finished_at: now,
      created_count: 1,
      skipped_duplicate_count: 2,
      evaluated_rule_count: 1,
      evaluated_job_count: 3,
      error_message: null,
    };
    const listQuery = new MockQuery({ data: [run], error: null });
    const createQuery = new MockQuery({ data: run, error: null });
    from
      .mockReturnValueOnce(listQuery as never)
      .mockReturnValueOnce(createQuery as never);

    const runs = await listAutomationSchedulerRunRecords();
    await createAutomationSchedulerRunRecord({
      status: "success",
      triggered_by: "cron",
      triggered_by_user_id: null,
      started_at: now,
      finished_at: now,
      created_count: 1,
      skipped_duplicate_count: 2,
      evaluated_rule_count: 1,
      evaluated_job_count: 3,
    });

    expect(runs).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("automation_scheduler_runs");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          created_count: 1,
          skipped_duplicate_count: 2,
          status: "success",
          triggered_by: "cron",
          triggered_by_user_id: null,
        }),
      ],
    ]);
  });


  it("creates generated notifications and treats unique conflicts as duplicates", async () => {
    const createQuery = new MockQuery({ data: notification, error: null });
    const duplicateQuery = new MockQuery({
      data: null,
      error: { code: "23505" },
    });
    from
      .mockReturnValueOnce(createQuery as never)
      .mockReturnValueOnce(duplicateQuery as never);

    const created = await createGeneratedNotificationEventRecord({
      rule_id: "rule-1",
      type: "follow_up_reminder",
      generated_key: "automation:rule-1:follow_up:job-1",
      customer_id: "customer-1",
      title: "Call Apex",
      due_at: now,
    });
    const duplicate = await createGeneratedNotificationEventRecord({
      rule_id: "rule-1",
      type: "follow_up_reminder",
      generated_key: "automation:rule-1:follow_up:job-1",
      customer_id: "customer-1",
      title: "Call Apex",
      due_at: now,
    });

    expect(created?.id).toBe("notification-1");
    expect(duplicate).toBeNull();
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          generated_key: "automation:rule-1:follow_up:job-1",
        }),
      ],
    ]);
  });

  it("marks notifications handled and dismissed", async () => {
    const handledQuery = new MockQuery({
      data: { ...notification, status: "handled", handled_at: now },
      error: null,
    });
    const dismissedQuery = new MockQuery({
      data: { ...notification, status: "dismissed" },
      error: null,
    });
    from
      .mockReturnValueOnce(handledQuery as never)
      .mockReturnValueOnce(dismissedQuery as never);

    await markNotificationEventHandledRecord("notification-1");
    await dismissNotificationEventRecord("notification-1");

    expect(handledQuery.calls[0][0]).toBe("update");
    expect(dismissedQuery.calls[0]).toEqual([
      "update",
      [{ status: "dismissed" }],
    ]);
  });

  it("sends notification delivery through the server route", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        event: {
          ...notification,
          delivery_status: "sent",
          delivery_provider: "manual",
          provider_message_id: "manual-1",
          delivery_attempts: 1,
          last_delivery_attempted_at: now,
          delivered_at: now,
        },
        provider: "manual",
        provider_message_id: "manual-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const sent = await sendNotificationEventDeliveryRecord("notification-1");

    expect(sent.delivery_status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/automation/notifications/notification-1/deliver",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("loads notification provider status through the server route", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        provider: "webhook",
        webhook_configured: true,
        webhook_secret_configured: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await getNotificationProviderStatusRecord();

    expect(status.provider).toBe("webhook");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/automation/notifications/provider-status",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
  });

  it("bulk sends notification delivery sequentially and reports failures", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          event: {
            ...notification,
            delivery_status: "sent",
            delivery_provider: "manual",
            provider_message_id: "manual-1",
            delivery_attempts: 1,
            last_delivery_attempted_at: now,
            delivered_at: now,
          },
          provider: "manual",
          provider_message_id: "manual-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "failed" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotificationEventDeliveriesRecord([
      "notification-1",
      "notification-2",
    ]);

    expect(result.sent_count).toBe(1);
    expect(result.failed_count).toBe(1);
    expect(result.results).toMatchObject([
      { id: "notification-1", status: "sent" },
      { id: "notification-2", status: "failed" },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/automation/notifications/notification-1/deliver",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/automation/notifications/notification-2/deliver",
      expect.any(Object),
    );
  });

  it("runs the automation scheduler through the admin manual route", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        result: {
          created: 2,
          evaluated_jobs: 3,
          evaluated_rules: 1,
          skipped_duplicates: 1,
        },
        run: schedulerRun,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runAutomationSchedulerManualRecord();

    expect(result.result.created).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/automation/scheduler/manual",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("surfaces manual scheduler route failures", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: "failed" }),
      }),
    );

    await expect(runAutomationSchedulerManualRecord()).rejects.toThrow(
      "Unable to run scheduler",
    );
  });
});
