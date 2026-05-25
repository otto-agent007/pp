import { describe, expect, it } from "vitest";

import {
  buildDemoWorkflowFixtures,
  shouldUseLocalDemoFixtures,
} from "./demoWorkflowFixtures";

describe("demo workflow fixtures", () => {
  it("materializes seeded demo records for read-only local workflows", () => {
    const fixtures = buildDemoWorkflowFixtures({
      now: new Date("2026-05-14T16:00:00.000Z"),
    });

    expect(fixtures.customers).toHaveLength(18);
    expect(fixtures.customers[0].locations).toHaveLength(2);
    expect(fixtures.technicians).toHaveLength(12);
    expect(fixtures.jobs).toHaveLength(30);
    expect(fixtures.jobs.filter((job) => !job.assigned_tech_id)).toHaveLength(
      3,
    );
    expect(fixtures.inventory).toHaveLength(6);
    expect(fixtures.invoices).toHaveLength(3);
    expect(fixtures.closeoutSummaries).toContainEqual({
      chemicalLogs: 3,
      forms: 2,
      jobId: "00000000-0000-4000-8000-00000000e002",
      photos: 2,
      signatures: 1,
    });
  });

  it("links jobs, invoices, captures, and technicians enough for workflows to render", () => {
    const fixtures = buildDemoWorkflowFixtures({
      now: new Date("2026-05-14T16:00:00.000Z"),
    });
    const completedJob = fixtures.jobs.find(
      (job) => job.id === "00000000-0000-4000-8000-00000000e002",
    );
    const paidInvoice = fixtures.invoices.find(
      (invoice) => invoice.id === "00000000-0000-4000-8000-00000000f002",
    );

    expect(completedJob?.customer?.name).toBe("Demo - Rivera Cafe");
    expect(completedJob?.location?.nickname).toBe("Cafe");
    expect(completedJob?.assigned_technician?.display_name).toBe(
      "Demo - Eli Brooks",
    );
    expect(paidInvoice?.job?.id).toBe(completedJob?.id);
    expect(paidInvoice?.customer?.id).toBe(completedJob?.customer_id);
    expect(paidInvoice?.payments?.[0]).toMatchObject({
      amount_cents: 14500,
      status: "succeeded",
    });
    expect(fixtures.formSubmissions[0].job?.id).toBe(completedJob?.id);
    expect(fixtures.chemicalLogs[0].chemical?.name).toBe(
      "Demo - Ant Bait Stations",
    );
    expect(fixtures.media[0].signed_url).toBe(
      "/demo-media/demo-rivera-cafe-dry-storage.svg",
    );
    expect(fixtures.media.some((item) => item.media_type === "signature")).toBe(
      true,
    );
  });

  it("enables local fixtures only outside production when public Supabase env is missing", () => {
    expect(
      shouldUseLocalDemoFixtures({
        nodeEnv: "development",
        supabaseAnonKey: undefined,
        supabaseUrl: undefined,
      }),
    ).toBe(true);

    expect(
      shouldUseLocalDemoFixtures({
        nodeEnv: "development",
        supabaseAnonKey: "anon",
        supabaseUrl: "http://localhost:54321",
      }),
    ).toBe(false);

    expect(
      shouldUseLocalDemoFixtures({
        nodeEnv: "production",
        supabaseAnonKey: undefined,
        supabaseUrl: undefined,
      }),
    ).toBe(false);
  });
});
