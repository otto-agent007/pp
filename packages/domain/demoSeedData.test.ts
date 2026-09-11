import { describe, expect, it } from "vitest";

import {
  DEMO_SEED_CONFIRMATION,
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_ADMIN_PASSWORD_ENV,
  DEMO_SEED_MARKER,
  resolveDemoSeedAdminPassword,
  buildDemoSeedRuntimeStatus,
  isAllowedDemoSeedUrl,
  buildDemoSeedPlan,
  getDemoSeedPlanSummary,
  validateDemoSeedGuardrails,
} from "./demoSeedData";

describe("demo seed data", () => {
  it("builds a stable synthetic full-ops seed plan with Pacific wall-clock jobs", () => {
    const plan = buildDemoSeedPlan({
      adminPassword: "demo-admin-pass-123",
      now: new Date("2026-05-14T16:38:00.000Z"),
      technicianPassword: "demo-pass-123",
    });

    expect(plan.marker).toBe(DEMO_SEED_MARKER);
    expect(plan.adminUsers).toEqual([
      {
        display_name: "Demo - Admin",
        email: DEMO_SEED_ADMIN_EMAIL,
        key: "demo-admin",
        password: "demo-admin-pass-123",
        role: "admin",
      },
    ]);
    expect(plan.customers).toHaveLength(100);
    expect(plan.customers[0]).toMatchObject({
      key: "harbor",
      name: "Demo - Harbor Heights HOA",
      email: "demo+harbor-hoa@example.test",
    });
    expect(
      plan.customers
        .flatMap((customer) => customer.locations)
        .every(
          (location) =>
            typeof location.latitude === "number" &&
            typeof location.longitude === "number",
        ),
    ).toBe(true);
    expect(plan.technicians).toHaveLength(16);
    expect(
      plan.technicians.every((tech) => tech.email.endsWith("@example.test")),
    ).toBe(true);
    expect(plan.inventory).toHaveLength(14);
    expect(plan.inventory.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "Demo - Non-Repellent Perimeter SC",
        "Demo - Insect Growth Regulator Concentrate",
        "Demo - Tamper-Resistant Bait Stations",
        "Demo - PPE Service Restock Kit",
      ]),
    );
    expect(
      plan.inventory
        .filter((item) => item.current_stock <= item.reorder_level)
        .map((item) => item.key),
    ).toEqual(expect.arrayContaining(["bait", "dust", "aerosol"]));
    expect(plan.inventory.some((item) => item.status === "archived")).toBe(
      true,
    );
    expect(plan.jobs).toHaveLength(180);
    expect(plan.jobs.map((job) => job.scheduled_start)).toContain(
      "2026-05-14T09:38:00.000Z",
    );
    expect(plan.jobs.map((job) => job.scheduled_end)).toContain(
      "2026-05-14T10:38:00.000Z",
    );
    expect(plan.jobs.some((job) => job.status === "completed")).toBe(true);
    expect(plan.jobs.some((job) => job.status === "in_progress")).toBe(true);
    expect(plan.jobs.some((job) => job.status === "canceled")).toBe(true);
    expect(plan.jobs.find((job) => job.key === "nguyen-today")).toMatchObject({
      billing_disposition: "included_in_recurring",
      service_cadence: "quarterly",
      service_offering_id: "general_pest_quarterly",
    });
    expect(plan.jobs.find((job) => job.key === "mesa-tomorrow")).toMatchObject({
      billing_disposition: "estimate_only",
      job_purpose: "estimate",
      service_offering_id: "rodent_inspection",
    });
    expect(plan.jobs.find((job) => job.key === "otay-tomorrow")).toMatchObject({
      job_purpose: "project_phase",
      service_cadence: "project",
      service_offering_id: "rodent_exclusion",
    });
    expect(
      plan.jobs.find((job) => job.key === "mission-brewery-completed"),
    ).toMatchObject({
      job_purpose: "inspection",
      service_offering_id: "wdo_escrow_inspection",
    });
    expect(
      plan.jobs.filter((job) => !job.assigned_technician_key).length,
    ).toBeGreaterThanOrEqual(3);
    expect(plan.chemicalLogs.length).toBeGreaterThanOrEqual(10);
    expect(plan.formSubmissions.length).toBeGreaterThanOrEqual(8);
    expect(plan.media.length).toBeGreaterThanOrEqual(7);
    expect(plan.invoices.map((invoice) => invoice.status)).toEqual([
      "sent",
      "paid",
      "draft",
      "sent",
      "void",
    ]);
    expect(
      plan.invoices.map((invoice) => invoice.payment?.status).filter(Boolean),
    ).toEqual(expect.arrayContaining(["succeeded", "pending", "failed"]));
    expect(JSON.stringify(plan)).toContain(DEMO_SEED_MARKER);
  });

  it("keeps generated demo records unique, linked, and inside the current dispatch week", () => {
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
    });
    const customerIds = new Set(plan.customers.map((customer) => customer.id));
    const locationIds = new Set(
      plan.customers.flatMap((customer) =>
        customer.locations.map((location) => location.id),
      ),
    );
    const inventoryKeys = new Set(plan.inventory.map((item) => item.key));
    const technicianKeys = new Set(
      plan.technicians.map((technician) => technician.key),
    );

    expect(customerIds.size).toBe(plan.customers.length);
    expect(new Set(plan.customers.map((customer) => customer.email)).size).toBe(
      100,
    );
    expect(new Set(plan.jobs.map((job) => job.id)).size).toBe(180);
    expect(new Set(plan.technicians.map((tech) => tech.email)).size).toBe(16);
    expect(plan.jobs.every((job) => customerIds.has(job.customer_id))).toBe(
      true,
    );
    expect(plan.jobs.every((job) => locationIds.has(job.location_id))).toBe(
      true,
    );
    expect(
      plan.jobs.every(
        (job) => !job.inventory_key || inventoryKeys.has(job.inventory_key),
      ),
    ).toBe(true);
    expect(
      plan.inventory.every(
        (item) =>
          item.name.startsWith("Demo - ") &&
          item.current_stock > 0 &&
          item.reorder_level >= 0,
      ),
    ).toBe(true);
    expect(
      plan.jobs.every(
        (job) =>
          !job.assigned_technician_key ||
          technicianKeys.has(job.assigned_technician_key),
      ),
    ).toBe(true);
    expect(
      plan.jobs.every((job) => {
        const date = job.scheduled_start.slice(0, 10);

        return date >= "2026-05-10" && date <= "2026-05-16";
      }),
    ).toBe(true);
    expect(
      plan.jobs.find((job) => job.key === "rivera-completed"),
    ).toMatchObject({
      customer_id: "00000000-0000-4000-8000-00000000c002",
      status: "completed",
    });
  });

  it("keeps every demo job inside the Sunday-Saturday dispatch week near week edges", () => {
    [
      new Date("2026-05-10T16:38:00.000Z"),
      new Date("2026-05-16T16:38:00.000Z"),
    ].forEach((now) => {
      const plan = buildDemoSeedPlan({ now });

      expect(
        plan.jobs.every((job) => {
          const date = job.scheduled_start.slice(0, 10);

          return date >= "2026-05-10" && date <= "2026-05-16";
        }),
      ).toBe(true);
    });
  });

  it("validates guardrails before any seed write can run", () => {
    expect(
      validateDemoSeedGuardrails({
        target: "preview",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
        previewSecretConfigured: true,
        previewSecretMatches: true,
        allowedSupabaseUrl: "https://example.supabase.co",
      }),
    ).toEqual({ ok: true, target: "preview" });

    expect(
      validateDemoSeedGuardrails({
        target: "preview",
        confirm: DEMO_SEED_CONFIRMATION,
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
        previewSecretConfigured: false,
      }),
    ).toEqual({
      ok: false,
      message:
        "Preview demo seed requires DEMO_SEED_PREVIEW_SECRET to be configured on this deployment.",
    });

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

    const summary = getDemoSeedPlanSummary(plan);

    expect(summary).toMatchObject({
      admin_users: 1,
      customers: 100,
      inventory_items: 14,
      invoices: 5,
      jobs: 180,
      locations: 108,
      payments: 3,
      technicians: 16,
    });
    expect(summary.chemical_logs).toBeGreaterThanOrEqual(25);
    expect(summary.form_submissions).toBeGreaterThanOrEqual(25);
    expect(summary.media_items).toBeGreaterThanOrEqual(45);
  });

  it("keeps completed closeouts production-filled with only a few intentional gaps", () => {
    const plan = buildDemoSeedPlan({
      now: new Date("2026-05-14T16:38:00.000Z"),
    });
    const completedAssignedJobs = plan.jobs.filter(
      (job) => job.status === "completed" && job.assigned_technician_key,
    );
    const chemicalLogJobIds = new Set(
      plan.chemicalLogs.map((log) => log.job_id),
    );
    const formJobIds = new Set(
      plan.formSubmissions.map((submission) => submission.job_id),
    );
    const photoJobIds = new Set(
      plan.media
        .filter((item) => item.media_type === "photo")
        .map((item) => item.job_id),
    );
    const signatureJobIds = new Set(
      plan.media
        .filter((item) => item.media_type === "signature")
        .map((item) => item.job_id),
    );

    const missingCaptureJobs = completedAssignedJobs.filter(
      (job) =>
        !chemicalLogJobIds.has(job.id) ||
        !formJobIds.has(job.id) ||
        !photoJobIds.has(job.id) ||
        !signatureJobIds.has(job.id),
    );

    expect(completedAssignedJobs.length).toBeGreaterThan(20);
    expect(missingCaptureJobs).toHaveLength(3);
    expect(missingCaptureJobs.map((job) => job.key)).toEqual(
      expect.arrayContaining([
        "mission-brewery-completed",
        "del-mar-completed",
        "generated-weekly-039",
      ]),
    );
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
        previewSecretConfigured: true,
        allowedSupabaseUrl: "https://project.supabase.co",
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
        vercelEnv: "preview",
        previewSecretConfigured: false,
      }),
    ).toMatchObject({
      available: false,
      environment_label: "Protected preview demo",
      reason:
        "Preview demo seed requires DEMO_SEED_PREVIEW_SECRET to be configured on this deployment.",
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

describe("demo seed admin credential", () => {
  it("uses the operator-supplied password when one is configured", () => {
    expect(
      resolveDemoSeedAdminPassword({
        [DEMO_SEED_ADMIN_PASSWORD_ENV]: "  rotated-demo-pass  ",
        NODE_ENV: "production",
      }),
    ).toBe("rotated-demo-pass");
  });

  it("refuses to fall back in a built deployment", () => {
    // NODE_ENV is "production" for previews too, and previews share the live
    // Supabase project, so there is no safe default to fall back to.
    expect(() =>
      resolveDemoSeedAdminPassword({ NODE_ENV: "production" }),
    ).toThrow(/DEMO_SEED_ADMIN_PASSWORD/);

    expect(() =>
      resolveDemoSeedAdminPassword({
        [DEMO_SEED_ADMIN_PASSWORD_ENV]: "   ",
        NODE_ENV: "production",
      }),
    ).toThrow(/DEMO_SEED_ADMIN_PASSWORD/);
  });

  it("refuses the local default when a caller declares the target is real", () => {
    // The seed CLI runs from an operator shell with NODE_ENV unset, so
    // `--target preview` has to opt in explicitly or it would silently seed a
    // real project with the local development password.
    expect(() =>
      resolveDemoSeedAdminPassword(
        { NODE_ENV: undefined },
        { requireConfigured: true },
      ),
    ).toThrow(/DEMO_SEED_ADMIN_PASSWORD/);

    expect(
      resolveDemoSeedAdminPassword(
        { [DEMO_SEED_ADMIN_PASSWORD_ENV]: "rotated-demo-pass" },
        { requireConfigured: true },
      ),
    ).toBe("rotated-demo-pass");
  });

  it("keeps a throwaway default for local development only", () => {
    expect(resolveDemoSeedAdminPassword({ NODE_ENV: "development" })).toBe(
      "password",
    );
  });

  it("builds a plan with no credential unless one is passed in", () => {
    // Status and summary callers include client components; a plan built for
    // them must never carry a password.
    expect(buildDemoSeedPlan().adminUsers[0]?.password).toBe("");
  });
});

describe("demo seed preview secret and project allowlist", () => {
  const previewBase = {
    confirm: DEMO_SEED_CONFIRMATION,
    serviceRoleKey: "service-role-key",
    supabaseUrl: "https://demo-project.supabase.co",
    target: "preview",
  } as const;

  it("refuses a preview seed when the secret is configured but never presented", () => {
    expect(
      validateDemoSeedGuardrails({
        ...previewBase,
        allowedSupabaseUrl: "https://demo-project.supabase.co",
        previewSecretConfigured: true,
      }),
    ).toEqual({
      ok: false,
      message: "Preview demo seed requires a matching x-demo-seed-secret header.",
    });
  });

  it("refuses a preview seed when the presented secret does not match", () => {
    expect(
      validateDemoSeedGuardrails({
        ...previewBase,
        allowedSupabaseUrl: "https://demo-project.supabase.co",
        previewSecretConfigured: true,
        previewSecretMatches: false,
      }),
    ).toEqual({
      ok: false,
      message: "Preview demo seed requires a matching x-demo-seed-secret header.",
    });
  });

  it("refuses a preview seed when no project is named, even with a matching secret", () => {
    expect(
      validateDemoSeedGuardrails({
        ...previewBase,
        previewSecretConfigured: true,
        previewSecretMatches: true,
      }),
    ).toEqual({
      ok: false,
      message:
        "Preview demo seed requires DEMO_SEED_ALLOWED_SUPABASE_URL to name the Supabase project it may write to.",
    });
  });

  it("refuses a preview seed aimed at a project other than the named one", () => {
    expect(
      validateDemoSeedGuardrails({
        ...previewBase,
        supabaseUrl: "https://production-project.supabase.co",
        allowedSupabaseUrl: "https://demo-project.supabase.co",
        previewSecretConfigured: true,
        previewSecretMatches: true,
      }),
    ).toEqual({
      ok: false,
      message:
        "Preview demo seed requires DEMO_SEED_ALLOWED_SUPABASE_URL to name the Supabase project it may write to.",
    });
  });

  it("reports the unnamed project as unavailable rather than letting the POST find out", () => {
    expect(
      buildDemoSeedRuntimeStatus({
        previewSecretConfigured: true,
        serviceRoleConfigured: true,
        supabaseUrl: "https://production-project.supabase.co",
        target: "preview",
        vercelEnv: "preview",
      }),
    ).toEqual({
      available: false,
      environment_label: "Protected preview demo",
      reason:
        "Preview demo seed requires DEMO_SEED_ALLOWED_SUPABASE_URL to name the Supabase project it may write to.",
      target: "preview",
    });
  });

  it("ignores a trailing slash and case when matching the named project", () => {
    expect(
      isAllowedDemoSeedUrl(
        "https://Demo-Project.supabase.co/",
        "https://demo-project.supabase.co",
      ),
    ).toBe(true);
  });

  it("strips any run of trailing slashes without re-scanning it", () => {
    const base = "https://demo-project.supabase.co";

    expect(isAllowedDemoSeedUrl(`${base}////`, base)).toBe(true);

    // A long run of slashes that does not end the string is the worst case for
    // the /\/+$/ this replaced: that pattern can start matching at any slash in
    // the run, so it re-scans the run once per slash. If it ever comes back,
    // this case does not fail slowly -- it exceeds the test timeout.
    expect(isAllowedDemoSeedUrl(`${"/".repeat(100_000)}x`, base)).toBe(false);
  });

  it("treats an unset allowlist as allowing nothing", () => {
    expect(isAllowedDemoSeedUrl("https://demo-project.supabase.co")).toBe(false);
    expect(isAllowedDemoSeedUrl("", "")).toBe(false);
  });
});
