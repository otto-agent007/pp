import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  useUpdateAutomationRule,
  useRestoreNotificationTemplate,
  useUpdateNotificationTemplate,
  useUpdateAutomationRuleStatus,
} from "../../hooks/useAutomation";
import { AutomationClient } from "./automation-client";

vi.mock("../../hooks/useAutomation", () => ({
  useAutomationRules: vi.fn(),
  useAutomationSchedulerRuns: vi.fn(),
  useArchiveNotificationTemplate: vi.fn(),
  useCreateAutomationRule: vi.fn(),
  useCreateNotificationEvent: vi.fn(),
  useCreateNotificationTemplate: vi.fn(),
  useDismissNotificationEvent: vi.fn(),
  useMarkNotificationEventHandled: vi.fn(),
  useNotificationEvents: vi.fn(),
  useNotificationProviderStatus: vi.fn(),
  useNotificationTemplates: vi.fn(),
  useRunAutomationScheduler: vi.fn(),
  useSendNotificationBulkDelivery: vi.fn(),
  useSendNotificationEventDelivery: vi.fn(),
  useUpdateAutomationRule: vi.fn(),
  useRestoreNotificationTemplate: vi.fn(),
  useUpdateNotificationTemplate: vi.fn(),
  useUpdateAutomationRuleStatus: vi.fn(),
}));

vi.mock("../../hooks/useCustomers", () => ({
  useCustomers: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

const now = "2026-05-06T12:00:00.000Z";
const customer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: null,
  email: null,
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: now,
  scheduled_end: null,
  status: "completed",
  service_notes: null,
  created_at: now,
  updated_at: now,
  customer,
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
const rule = {
  id: "rule-1",
  name: "Post-service follow-up",
  type: "follow_up_reminder",
  status: "active",
  template_id: "template-1",
  offset_days: 2,
  message: "Check satisfaction",
  template: {
    id: "template-1",
    name: "Follow-up call",
    type: "follow_up_reminder",
    status: "active",
    title: "Call customer",
    message: "Ask how the service went",
    created_at: now,
    updated_at: now,
  },
  created_at: now,
  updated_at: now,
} as const;
const notification = {
  id: "notification-1",
  rule_id: "rule-1",
  type: "follow_up_reminder",
  generated_key: null,
  customer_id: "customer-1",
  job_id: "job-1",
  status: "pending",
  title: "Call Apex",
  message: "Check satisfaction",
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
  customer,
  job,
  rule,
} as const;
const template = {
  id: "template-1",
  name: "Follow-up call",
  type: "follow_up_reminder",
  status: "active",
  title: "Call customer",
  message: "Ask how the service went",
  created_at: now,
  updated_at: now,
} as const;
const variableTemplate = {
  ...template,
  id: "template-variables",
  name: "Variable follow-up",
  title: "Call {{customer.name}}",
  message: "Ask about {{location.address}} on {{service.date}}",
} as const;
const generatedNotification = {
  ...notification,
  id: "notification-generated",
  title: "Follow up with Apex Homes",
  generated_key: "automation:rule-1:follow_up:job-1",
  created_at: "2026-05-06T13:00:00.000Z",
} as const;
const failedNotification = {
  ...notification,
  id: "notification-failed",
  title: "Failed reminder",
  delivery_status: "failed",
  last_delivery_error: "Provider timeout",
} as const;
const manualReviewNotification = {
  ...notification,
  id: "notification-manual-review",
  title: "Manual review reminder",
  delivery_attempts: 3,
  delivery_status: "failed",
  last_delivery_error: "Provider timeout",
} as const;
const sentNotification = {
  ...notification,
  id: "notification-sent",
  title: "Sent reminder",
  delivery_status: "sent",
  delivery_provider: "webhook",
  provider_message_id: "provider-message-1",
  delivery_attempts: 1,
  last_delivery_attempted_at: now,
  delivered_at: now,
} as const;
const sendingNotification = {
  ...notification,
  id: "notification-sending",
  title: "Sending reminder",
  delivery_status: "sending",
  delivery_attempts: 1,
  last_delivery_attempted_at: now,
} as const;
const schedulerRun = {
  id: "run-1",
  status: "success",
  triggered_by: "manual",
  triggered_by_user_id: "admin-1",
  started_at: "2026-05-06T13:00:00.000Z",
  finished_at: "2026-05-06T13:00:01.000Z",
  created_count: 1,
  skipped_duplicate_count: 2,
  evaluated_rule_count: 1,
  evaluated_job_count: 3,
  error_message: null,
} as const;

function templatesSection() {
  return screen.getByText("Notification templates").closest("section")!;
}

function chooseSearchableOption(
  name: string | RegExp,
  search: string,
  optionName: string | RegExp,
) {
  const input = screen.getByRole("combobox", { name });

  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: search } });
  const listbox = document.getElementById(
    input.getAttribute("aria-controls") ?? "",
  );

  expect(listbox).toBeInTheDocument();
  fireEvent.mouseDown(
    within(listbox!).getByRole("option", { name: optionName }),
  );
  fireEvent.blur(input);
}

describe("AutomationClient", () => {
  const createRule = vi.fn();
  const updateRule = vi.fn();
  const updateRuleStatus = vi.fn();
  const createNotification = vi.fn();
  const createTemplate = vi.fn();
  const updateTemplate = vi.fn();
  const archiveTemplate = vi.fn();
  const restoreTemplate = vi.fn();
  const markHandled = vi.fn();
  const dismissNotification = vi.fn();
  const sendNotification = vi.fn();
  const sendBulkNotifications = vi.fn();
  const runScheduler = vi.fn();

  beforeEach(() => {
    vi.mocked(useAutomationRules).mockReturnValue({
      data: [rule],
      isLoading: false,
    } as never);
    vi.mocked(useAutomationSchedulerRuns).mockReturnValue({
      data: [schedulerRun],
      isLoading: false,
    } as never);
    vi.mocked(useNotificationEvents).mockReturnValue({
      data: [notification, generatedNotification],
      isLoading: false,
    } as never);
    vi.mocked(useNotificationProviderStatus).mockReturnValue({
      data: {
        provider: "webhook",
        webhook_configured: true,
        webhook_secret_configured: true,
      },
      isLoading: false,
    } as never);
    vi.mocked(useNotificationTemplates).mockReturnValue({
      data: [template],
      isLoading: false,
    } as never);
    vi.mocked(useCustomers).mockReturnValue({
      data: [customer],
      isLoading: false,
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [job],
      isLoading: false,
    } as never);
    vi.mocked(useCreateAutomationRule).mockReturnValue({
      mutateAsync: createRule,
      isPending: false,
    } as never);
    vi.mocked(useUpdateAutomationRule).mockReturnValue({
      mutateAsync: updateRule,
      isPending: false,
    } as never);
    vi.mocked(useUpdateAutomationRuleStatus).mockReturnValue({
      mutate: updateRuleStatus,
      isPending: false,
    } as never);
    vi.mocked(useCreateNotificationEvent).mockReturnValue({
      mutateAsync: createNotification,
      isPending: false,
    } as never);
    vi.mocked(useCreateNotificationTemplate).mockReturnValue({
      mutateAsync: createTemplate,
      isPending: false,
    } as never);
    vi.mocked(useUpdateNotificationTemplate).mockReturnValue({
      mutateAsync: updateTemplate,
      isPending: false,
    } as never);
    vi.mocked(useArchiveNotificationTemplate).mockReturnValue({
      mutate: archiveTemplate,
      isPending: false,
    } as never);
    vi.mocked(useRestoreNotificationTemplate).mockReturnValue({
      mutate: restoreTemplate,
      isPending: false,
    } as never);
    vi.mocked(useMarkNotificationEventHandled).mockReturnValue({
      mutate: markHandled,
      isPending: false,
    } as never);
    vi.mocked(useDismissNotificationEvent).mockReturnValue({
      mutate: dismissNotification,
      isPending: false,
    } as never);
    vi.mocked(useSendNotificationEventDelivery).mockReturnValue({
      mutate: sendNotification,
      isPending: false,
    } as never);
    vi.mocked(useSendNotificationBulkDelivery).mockReturnValue({
      data: null,
      isError: false,
      isPending: false,
      mutate: sendBulkNotifications,
    } as never);
    vi.mocked(useRunAutomationScheduler).mockReturnValue({
      mutate: runScheduler,
      isError: false,
      isPending: false,
      isSuccess: false,
    } as never);
    createRule.mockReset();
    updateRule.mockReset();
    updateRuleStatus.mockReset();
    createNotification.mockReset();
    createTemplate.mockReset();
    updateTemplate.mockReset();
    archiveTemplate.mockReset();
    restoreTemplate.mockReset();
    markHandled.mockReset();
    dismissNotification.mockReset();
    sendNotification.mockReset();
    sendBulkNotifications.mockReset();
    runScheduler.mockReset();
    createRule.mockResolvedValue(rule);
    updateRule.mockResolvedValue(rule);
    createNotification.mockResolvedValue(notification);
    createTemplate.mockResolvedValue(template);
    updateTemplate.mockResolvedValue(template);
  });

  it("renders summaries and filters notifications", () => {
    render(<AutomationClient />);

    expect(screen.getByText("Operator snapshot")).toBeInTheDocument();
    expect(screen.getByText("Delivery health")).toBeInTheDocument();
    expect(screen.getByText("Call Apex")).toBeInTheDocument();
    expect(screen.getByText("Notification templates")).toBeInTheDocument();
    expect(screen.getAllByText("Follow-up call").length).toBeGreaterThan(0);
    expect(screen.getByText("Notification generation")).toBeInTheDocument();
    expect(
      screen.getByText("Provider: Webhook configured"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Provider credential configured"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Webhook notification delivery"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Provider delivery is configured, but receipts remain evidence-gated until provider smoke passes.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Follow up with Apex Homes").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(
      screen.getByText(/Last run .* by Manual \(admin-1\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("Duplicates")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Post-service follow-up" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search notifications"), {
      target: { value: "missing" },
    });

    expect(screen.getByText("No notifications found")).toBeInTheDocument();
  });

  it("shows manual fallback setup guidance without exposing provider secrets", () => {
    vi.mocked(useNotificationProviderStatus).mockReturnValue({
      data: {
        provider: "manual",
        webhook_configured: false,
        webhook_secret_configured: false,
      },
      isLoading: false,
    } as never);
    render(<AutomationClient />);

    expect(screen.getByText("Provider: Manual fallback")).toBeInTheDocument();
    expect(
      screen.getByText("Visible pending reminders").closest(".rounded-lg"),
    ).toHaveClass(
      "bg-status-alert-warning-bg",
      "border-status-alert-warning-border",
    );
    expect(screen.getByText("Manual fallback accepted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manual notification follow-up stays available without changing provider settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Webhook delivery and receipts remain deferred until provider setup is approved.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/https:\/\/provider.example/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/NOTIFICATION_DELIVERY_/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/webhook secret/i)).not.toBeInTheDocument();
  });

  it("filters notification delivery triage states", async () => {
    const user = userEvent.setup();
    vi.mocked(useNotificationEvents).mockReturnValue({
      data: [
        notification,
        failedNotification,
        manualReviewNotification,
        sentNotification,
      ],
      isLoading: false,
    } as never);
    render(<AutomationClient />);

    expect(screen.getByText("Failed (2)")).toBeInTheDocument();
    expect(screen.getByText("Retryable (2)")).toBeInTheDocument();
    expect(screen.getByText("Manual review 1")).toBeInTheDocument();
    expect(screen.getByText("Not sent 1")).toBeInTheDocument();
    expect(screen.getByText("Sent 1")).toBeInTheDocument();
    expect(screen.getByText("Reachable 0")).toBeInTheDocument();
    expect(screen.getByText("Missing contact 4")).toBeInTheDocument();
    expect(screen.getByText("Attempts 4")).toBeInTheDocument();
    expect(screen.getByText("Manual review reminder")).toBeInTheDocument();
    expect(screen.getByText("Manual review")).toBeInTheDocument();
    expect(
      screen.getByText("Provider message: provider-message-1"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Last attempt May 6, 2026/)).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Notification delivery status"),
      "failed",
    );

    expect(screen.getByText("Failed reminder")).toBeInTheDocument();
    expect(screen.getByText("Manual review reminder")).toBeInTheDocument();
    expect(screen.queryByText("Sent reminder")).not.toBeInTheDocument();
    expect(screen.queryByText("Call Apex")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retryable (2)" }));

    expect(screen.getByText("Failed reminder")).toBeInTheDocument();
    expect(screen.getByText("Call Apex")).toBeInTheDocument();
    expect(
      screen.queryByText("Manual review reminder"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Sent reminder")).not.toBeInTheDocument();
  });

  it("shows in-flight delivery state without allowing duplicate sends", () => {
    vi.mocked(useNotificationEvents).mockReturnValue({
      data: [sendingNotification],
      isLoading: false,
    } as never);
    render(<AutomationClient />);

    expect(screen.getByText("Sending reminder")).toBeInTheDocument();
    expect(screen.getAllByText("Sending").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Sending" })).toBeDisabled();
  });

  it("shows recipient readiness for notification contact data", async () => {
    const user = userEvent.setup();
    vi.mocked(useNotificationEvents).mockReturnValue({
      data: [
        {
          ...notification,
          id: "notification-email-ready",
          customer: {
            ...customer,
            email: "office@apex.example",
          },
          job: null,
          job_id: null,
          title: "Email ready reminder",
        },
        {
          ...notification,
          id: "notification-phone-ready",
          customer: null,
          customer_id: null,
          job: {
            ...job,
            customer: {
              ...customer,
              phone: "555-0100",
            },
          },
          title: "Phone ready reminder",
        },
        {
          ...notification,
          id: "notification-missing-contact",
          customer: null,
          customer_id: null,
          job: null,
          job_id: "job-missing-context",
          title: "Missing contact reminder",
        },
      ],
      isLoading: false,
    } as never);
    render(<AutomationClient />);

    expect(
      screen.getByText("Recipient: Apex Homes | Email ready | Phone missing"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Recipient: Apex Homes | Email missing | Phone ready"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Recipient: No customer | Email missing | Phone missing",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Notification recipient readiness"),
      "missing",
    );

    expect(screen.queryByText("Email ready reminder")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone ready reminder")).not.toBeInTheDocument();
    expect(screen.getByText("Missing contact reminder")).toBeInTheDocument();
  });

  it("creates automation rules", async () => {
    render(<AutomationClient />);

    fireEvent.change(screen.getByLabelText("Rule name"), {
      target: { value: "Quarterly prompt" },
    });
    fireEvent.change(screen.getByLabelText("Rule type"), {
      target: { value: "recurring_service_prompt" },
    });
    fireEvent.change(screen.getByLabelText("Offset days"), {
      target: { value: "90" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
    });

    expect(createRule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Quarterly prompt",
        type: "recurring_service_prompt",
        offset_days: 90,
      }),
    );
  });

  it("edits automation rules with templates", async () => {
    render(<AutomationClient />);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(
      screen.getByRole("heading", { name: "Edit rule" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rule template")).toHaveValue("template-1");
    fireEvent.change(screen.getByLabelText("Rule name"), {
      target: { value: "Updated follow-up" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Update rule" }));
    });

    expect(updateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rule-1",
        input: expect.objectContaining({
          name: "Updated follow-up",
          template_id: "template-1",
        }),
      }),
    );
  });

  it("clears a mismatched rule template when rule type changes", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);

    await user.selectOptions(
      screen.getByLabelText("Rule template"),
      "template-1",
    );
    await user.selectOptions(
      screen.getByLabelText("Rule type"),
      "recurring_service_prompt",
    );

    expect(screen.getByLabelText("Rule template")).toHaveValue("");
  });

  it("creates and edits notification templates", async () => {
    render(<AutomationClient />);
    const section = within(templatesSection());

    fireEvent.change(section.getByLabelText("Template name"), {
      target: { value: "Quarterly call" },
    });
    fireEvent.change(section.getByLabelText("Template type"), {
      target: { value: "recurring_service_prompt" },
    });
    fireEvent.change(section.getByLabelText("Template title"), {
      target: { value: "Schedule service" },
    });
    fireEvent.change(section.getByLabelText("Template message"), {
      target: { value: "Time to schedule the next visit" },
    });
    await act(async () => {
      fireEvent.click(section.getByRole("button", { name: "Save template" }));
    });
    fireEvent.click(section.getByRole("button", { name: "Edit" }));
    fireEvent.change(section.getByLabelText("Template title"), {
      target: { value: "Updated title" },
    });
    await act(async () => {
      fireEvent.click(section.getByRole("button", { name: "Update template" }));
    });
    fireEvent.click(section.getByRole("button", { name: "Archive" }));

    expect(createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Quarterly call",
        title: "Schedule service",
        type: "recurring_service_prompt",
      }),
    );
    expect(updateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "template-1",
        input: expect.objectContaining({
          title: "Updated title",
        }),
      }),
    );
    expect(archiveTemplate).toHaveBeenCalledWith("template-1");
  });

  it("previews template variables and saves interpolated reminder copy", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);
    const section = within(templatesSection());

    fireEvent.change(section.getByLabelText("Template title"), {
      target: { value: "Call {{customer.name}}" },
    });
    fireEvent.change(section.getByLabelText("Template message"), {
      target: { value: "Visit {{location.address}} on {{service.date}}" },
    });

    expect(section.getByLabelText("Template preview title")).toHaveTextContent(
      "Call Apex Homes",
    );
    expect(
      section.getByLabelText("Template preview message"),
    ).toHaveTextContent("Visit 10 Pine Street on May 6, 2026");

    fireEvent.change(screen.getByLabelText("Reminder title"), {
      target: { value: variableTemplate.title },
    });
    fireEvent.change(screen.getByLabelText("Reminder message"), {
      target: { value: variableTemplate.message },
    });
    chooseSearchableOption("Reminder job", "pine", /Apex Homes/);
    fireEvent.change(screen.getByLabelText("Reminder due"), {
      target: { value: "2026-05-07T09:00" },
    });

    expect(screen.getByLabelText("Reminder preview title")).toHaveTextContent(
      "Call Apex Homes",
    );
    expect(screen.getByLabelText("Reminder preview message")).toHaveTextContent(
      "Ask about 10 Pine Street on May 6, 2026",
    );

    await user.click(screen.getByRole("button", { name: "Save reminder" }));

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job-1",
        title: "Call Apex Homes",
        message: "Ask about 10 Pine Street on May 6, 2026",
      }),
    );
  });

  it("previews due scheduler output and labels duplicates", async () => {
    const user = userEvent.setup();
    const dueJob = {
      ...job,
      scheduled_start: "2020-01-01T12:00:00.000Z",
      scheduled_end: null,
    };

    vi.mocked(useJobs).mockReturnValue({
      data: [dueJob],
      isLoading: false,
    } as never);
    vi.mocked(useAutomationRules).mockReturnValue({
      data: [
        {
          ...rule,
          offset_days: 0,
          template_id: "template-variables",
          template: variableTemplate,
        },
      ],
      isLoading: false,
    } as never);

    render(<AutomationClient />);

    expect(screen.getByText("Due preview")).toBeInTheDocument();
    expect(
      screen.getByText("Evaluated 1 completed jobs and 1 active rules"),
    ).toBeInTheDocument();
    expect(screen.getByText("Call Apex Homes")).toBeInTheDocument();
    expect(
      screen.getByText("Ask about 10 Pine Street on Jan 1, 2020"),
    ).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(
      screen.getByText("automation:rule-1:follow_up:job-1"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refresh preview" }));

    expect(runScheduler).not.toHaveBeenCalled();
  }, 10_000);

  it("uses shared primitive styling for operator clarity controls", () => {
    const dueJob = {
      ...job,
      scheduled_start: "2020-01-01T12:00:00.000Z",
      scheduled_end: null,
    };

    vi.mocked(useJobs).mockReturnValue({
      data: [dueJob],
      isLoading: false,
    } as never);
    vi.mocked(useAutomationRules).mockReturnValue({
      data: [
        {
          ...rule,
          offset_days: 0,
          template_id: "template-variables",
          template: variableTemplate,
        },
      ],
      isLoading: false,
    } as never);

    render(<AutomationClient />);

    expect(screen.getByText("Delivery breakdown")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toHaveClass(
      "rounded-full",
      "border-status-alert-warning-border",
    );
    expect(
      within(
        screen.getByRole("heading", { name: "Post-service follow-up" })
          .closest("article")!,
      ).getByText("active"),
    ).toHaveClass("rounded-full", "border-status-alert-success-border");
    expect(
      within(screen.getByText("Call Apex").closest("article")!).getByRole(
        "button",
        { name: "Send" },
      ),
    ).toHaveClass("focus-visible:ring-theme-action-primary");
    expect(
      within(templatesSection()).getByRole("button", {
        name: "Save template",
      }),
    ).toHaveClass("focus-visible:ring-theme-action-primary");
  });

  it("creates and handles notification events", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);

    chooseSearchableOption("Reminder template", "follow", "Follow-up call");
    expect(screen.getByLabelText("Reminder title")).toHaveValue(
      "Call customer",
    );
    chooseSearchableOption("Reminder rule", "post", "Post-service follow-up");
    chooseSearchableOption("Reminder customer", "apex", "Apex Homes");
    fireEvent.change(screen.getByLabelText("Reminder due"), {
      target: { value: "2026-05-07T09:00" },
    });
    await user.click(screen.getByRole("button", { name: "Save reminder" }));
    await user.click(screen.getAllByRole("button", { name: "Send" })[0]);
    await user.click(
      screen.getAllByRole("button", { name: "Mark handled" })[0],
    );
    await user.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "customer-1",
        rule_id: "rule-1",
        title: "Call customer",
        message: "Ask how the service went",
      }),
    );
    expect(sendNotification).toHaveBeenCalledWith("notification-1");
    expect(markHandled).toHaveBeenCalledWith("notification-1");
    expect(dismissNotification).toHaveBeenCalledWith("notification-1");
  });

  it("bulk sends visible pending notifications", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);

    expect(
      screen.getByText("2 ready to send from the current list"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Send visible pending" }),
    );

    expect(sendBulkNotifications).toHaveBeenCalledWith([
      "notification-1",
      "notification-generated",
    ]);
  });

  it("runs the scheduler manually", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);

    await user.click(screen.getByRole("button", { name: "Run scheduler" }));

    expect(runScheduler).toHaveBeenCalled();
  });

  it("pauses and archives rules", async () => {
    const user = userEvent.setup();
    render(<AutomationClient />);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    await user.click(screen.getAllByRole("button", { name: "Archive" })[0]);

    expect(updateRuleStatus).toHaveBeenCalledWith({
      id: "rule-1",
      status: "paused",
    });
    expect(updateRuleStatus).toHaveBeenCalledWith({
      id: "rule-1",
      status: "archived",
    });
  });
});
