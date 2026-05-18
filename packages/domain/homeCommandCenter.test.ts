import { describe, expect, it } from "vitest";

import { buildHomeCommandCenterState } from "./homeCommandCenter";

const now = new Date("2026-05-14T16:00:00.000Z");

describe("home command center", () => {
  it("builds field-command KPIs, alerts, next action, and demo checklist state", () => {
    const state = buildHomeCommandCenterState({
      now,
      customers: [{ status: "active" }, { status: "archived" }],
      jobs: [
        {
          customerName: "Demo - Rivera Cafe",
          id: "job-complete",
          scheduled_start: "2026-05-14T07:45:00.000Z",
          serviceLabel: "General Pest",
          status: "completed",
        },
        {
          customerName: "Demo - Harbor Heights HOA",
          id: "job-active",
          scheduled_start: "2026-05-14T09:38:00.000Z",
          serviceLabel: "Rodent Control",
          status: "scheduled",
        },
        {
          customerName: "Demo - Morena Townhomes",
          id: "job-route",
          scheduled_start: "2026-05-14T11:00:00.000Z",
          serviceLabel: "Termite Inspection",
          status: "en_route",
        },
      ],
      technicians: [{ status: "active" }, { status: "inactive" }],
      inventory: [
        {
          current_stock: 4,
          name: "Demo - Ant Bait Stations",
          reorder_level: 6,
        },
      ],
      invoices: [{ status: "sent", total_cents: 28500 }],
      portalProviderStatus: {
        provider: "manual",
        webhook_configured: false,
        webhook_secret_configured: false,
      },
    });

    expect(state.kpis).toEqual([
      {
        detail: "2 active today",
        id: "todays-jobs",
        label: "Today's jobs",
        severity: "good",
        value: "3",
      },
      {
        detail: "1 active",
        id: "technicians",
        label: "Technicians",
        severity: "good",
        value: "2",
      },
      {
        detail: "Today",
        id: "completed",
        label: "Completed",
        severity: "good",
        value: "1",
      },
      {
        detail: "1 unpaid",
        id: "open-invoices",
        label: "Open invoices",
        severity: "urgent",
        value: "$285.00",
      },
    ]);
    expect(state.schedule[0]).toMatchObject({
      customerName: "Demo - Rivera Cafe",
      href: "/jobs/job-complete",
      serviceLabel: "General Pest",
      statusLabel: "Completed",
      timeLabel: "7:45 AM",
    });
    expect(state.alerts).toContainEqual({
      detail: "Demo - Ant Bait Stations is at 4 with reorder at 6.",
      id: "low-inventory",
      label: "Low inventory",
      severity: "warning",
    });
    expect(state.nextAction).toEqual({
      href: "/payments",
      label: "Review 1 open invoice",
      summary: "Send or reconcile open customer billing before handoff.",
    });
    expect(state.portalProviderLabel).toBe("Manual portal sharing");
    expect(state.launchReadiness).toContainEqual({
      action:
        "Load the approved local Supabase values in the operator shell, then rerun the read-only preflight before seed/reset or browser smoke.",
      command: "corepack pnpm demo:smoke -- --target local",
      href: "/",
      id: "local-smoke",
      label: "Local smoke preflight",
      severity: "warning",
      stateLabel: "Blocked on approved local env",
      summary: "Seed/reset and Browser smoke stay gated until local preflight is ready.",
    });
    expect(state.launchReadiness).toContainEqual({
      action:
        "Confirm copy/manual portal handoff in customer links and keep receipt work deferred until webhook-backed evidence exists.",
      href: "/customers",
      id: "provider-mode",
      label: "Portal delivery mode",
      severity: "good",
      stateLabel: "Manual fallback accepted",
      summary: "Provider-free demos can proceed without mutating webhook settings.",
    });
    expect(state.smokeChecklist[0]).toEqual({
      action: "Add the customer, primary contact, and first service address.",
      evidencePrompt:
        "Record the route, action taken, and visible success signal without adding provider secrets or production customer data.",
      href: "/customers",
      id: "customer",
      label: "Create customer and location",
      routeLabel: "Customers",
      successSignal: "Customer appears active with at least one active location.",
    });
  });

  it("uses safe empty-state copy when live data is still unavailable", () => {
    const state = buildHomeCommandCenterState({ now });

    expect(state.kpis.map((kpi) => kpi.value)).toEqual(["0", "0", "0", "$0.00"]);
    expect(state.schedule).toEqual([]);
    expect(state.alerts).toContainEqual({
      detail: "Run or reset the local demo story before presenting the workflow.",
      id: "seed-demo",
      label: "Seed demo story",
      severity: "neutral",
    });
    expect(state.nextAction).toEqual({
      href: "/",
      label: "Seed demo story",
      summary: "Use local demo data controls before running the guided smoke.",
    });
    expect(state.launchReadiness.map((item) => item.id)).toEqual([
      "local-smoke",
      "preview-smoke",
      "compliance-setup",
      "provider-mode",
    ]);
    expect(state.smokeChecklist).toHaveLength(5);
  });

  it("marks portal delivery mode as webhook configured only when both webhook values are present", () => {
    const state = buildHomeCommandCenterState({
      now,
      portalProviderStatus: {
        provider: "webhook",
        webhook_configured: true,
        webhook_secret_configured: true,
      },
    });

    expect(state.launchReadiness).toContainEqual({
      action:
        "Use approved preview smoke to prove provider delivery before adding receipt or retry follow-ups.",
      href: "/customers",
      id: "provider-mode",
      label: "Portal delivery mode",
      severity: "good",
      stateLabel: "Webhook configured",
      summary: "Delivery receipts remain evidence-gated until provider smoke passes.",
    });
  });
});
