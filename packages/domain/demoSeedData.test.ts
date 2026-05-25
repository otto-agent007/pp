import { describe, expect, it } from "vitest";

import {
  DEMO_SEED_CONFIRMATION,
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_ADMIN_PASSWORD,
  DEMO_SEED_MARKER,
  buildDemoSeedRuntimeStatus,
  buildDemoSeedPlan,
  getDemoSeedPlanSummary,
  validateDemoSeedGuardrails,
} from "./demoSeedData";

describe("demo seed data", () => {
  it("builds a stable synthetic full-ops seed plan with Pacific wall-clock jobs", () => {
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
      technicianPassword: "demo-pass-123",
    });

    expect(plan.marker).toBe(DEMO_SEED_MARKER);
    expect(plan.adminUsers).toEqual([
      {
        display_name: "Demo - Admin",
        email: DEMO_SEED_ADMIN_EMAIL,
        key: "demo-admin",
        password: DEMO_SEED_ADMIN_PASSWORD,
        role: "admin",
      },
    ]);
    expect(plan.customers).toHaveLength(18);
    expect(plan.customers[0]).toMatchObject({
      key: "harbor",
      name: "Demo - Harbor Heights HOA",
      email: "demo+harbor-hoa@example.test",
    });
    expect(plan.technicians).toHaveLength(12);
    expect(
      plan.technicians.every((tech) => tech.email.endsWith("@example.test")),
    ).toBe(true);
    expect(plan.inventory).toHaveLength(6);
    expect(plan.jobs).toHaveLength(30);
    expect(plan.jobs.map((job) => job.scheduled_start)).toContain(
      "2026-05-14T09:38:00.000Z",
    );
    expect(plan.jobs.map((job) => job.scheduled_end)).toContain(
      "2026-05-14T10:38:00.000Z",
    );
    expect(plan.jobs.some((job) => job.status === "completed")).toBe(true);
    expect(plan.jobs.some((job) => job.status === "in_progress")).toBe(true);
    expect(plan.jobs.some((job) => job.status === "canceled")).toBe(true);
    expect(
      plan.jobs.filter((job) => !job.assigned_technician_key),
    ).toHaveLength(3);
    expect(plan.chemicalLogs).toHaveLength(6);
    expect(plan.formSubmissions).toHaveLength(4);
    expect(plan.media).toHaveLength(3);
    expect(plan.invoices.map((invoice) => invoice.status)).toEqual([
      "sent",
      "paid",
      "draft",
    ]);
    expect(JSON.stringify(plan)).toContain(DEMO_SEED_MARKER);
  });

  it("validates guardrails before any seed write can run", () => {
    expect(
      validateDemoSeedGuardrails({
        target: "preview",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
      }),
    ).toEqual({ ok: true, target: "preview" });

    expect(
      validateDemoSeedGuardrails({
        target: "production",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
      }),
    ).toEqual({
      ok: false,
      message: "Demo seed target must be local or preview.",
    });

    expect(
      validateDemoSeedGuardrails({
        target: "local",
        confirm: "yes",
        supabaseUrl: "http://localhost:54321",
        serviceRoleKey: "service-role-key",
      }),
    ).toEqual({
      ok: false,
      message: `Pass --confirm ${DEMO_SEED_CONFIRMATION} to write demo data.`,
    });

    expect(
      validateDemoSeedGuardrails({
        target: "preview",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://project.supabase.co",
        serviceRoleKey: "service-role-key",
        vercelEnv: "production",
      }),
    ).toEqual({
      ok: false,
      message: "Demo seed is disabled on production deployments.",
    });

    expect(
      validateDemoSeedGuardrails({
        target: "local",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://project.supabase.co",
        serviceRoleKey: "service-role-key",
      }),
    ).toEqual({
      ok: false,
      message: "Local demo seed requires a local Supabase URL.",
    });
  });

  it("defines reset ownership filters and dependency ordering", () => {
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
    });

    expect(plan.resetFilters.customerNamePrefix).toBe("Demo - ");
    expect(plan.resetFilters.customerEmailPrefix).toBe("demo+");
    expect(plan.resetFilters.adminEmail).toBe(DEMO_SEED_ADMIN_EMAIL);
    expect(plan.resetFilters.technicianEmailPrefix).toBe("demo+tech-");
    expect(plan.resetFilters.marker).toBe(DEMO_SEED_MARKER);
    expect(plan.seedOrder).toEqual([
      "adminUsers",
      "technicians",
      "customers",
      "inventory",
      "jobs",
      "chemicalLogs",
      "formSubmissions",
      "media",
      "invoices",
      "payments",
    ]);
    expect(plan.resetOrder).toEqual([
      "payments",
      "invoiceLineItems",
      "invoices",
      "formSubmissions",
      "chemicalLogs",
      "media",
      "jobs",
      "inventory",
      "locations",
      "customers",
      "technicians",
      "adminUsers",
    ]);
  });

  it("summarizes the seed story for operator-facing dry runs", () => {
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
    });

    expect(getDemoSeedPlanSummary(plan)).toEqual({
      admin_users: 1,
      chemical_logs: 6,
      customers: 18,
      form_submissions: 4,
      inventory_items: 6,
      invoices: 3,
      jobs: 30,
      locations: 26,
      media_items: 3,
      payments: 1,
      technicians: 12,
    });
  });

  it("builds user-facing runtime status without allowing production writes", () => {
    expect(
      buildDemoSeedRuntimeStatus({
        serviceRoleConfigured: true,
        supabaseUrl: "http://localhost:54321",
        target: "local",
      }),
    ).toMatchObject({
      available: true,
      environment_label: "Local demo",
      reason: null,
      target: "local",
    });

    expect(
      buildDemoSeedRuntimeStatus({
        serviceRoleConfigured: true,
        supabaseUrl: "https://project.supabase.co",
        target: "preview",
        vercelEnv: "preview",
      }),
    ).toMatchObject({
      available: true,
      environment_label: "Protected preview demo",
      reason: null,
      target: "preview",
    });

    expect(
      buildDemoSeedRuntimeStatus({
        serviceRoleConfigured: true,
        supabaseUrl: "https://project.supabase.co",
        target: "preview",
        vercelEnv: "production",
      }),
    ).toEqual({
      available: false,
      environment_label: "Production",
      reason: "Demo seed is disabled on production deployments.",
      target: "preview",
    });

    expect(
      buildDemoSeedRuntimeStatus({
        serviceRoleConfigured: false,
        supabaseUrl: "http://localhost:54321",
        target: "local",
      }),
    ).toMatchObject({
      available: false,
      reason: "SUPABASE_SERVICE_ROLE_KEY is required.",
    });
  });
});
