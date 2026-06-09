import { describe, expect, it } from "vitest";

import {
  buildDemoWorkflowFixtures,
  shouldUseLocalDemoFixtures,
} from "./demoWorkflowFixtures";
import { buildBillingQueue } from "./closeouts";

describe("demo workflow fixtures", () => {
  it("materializes seeded demo records for read-only local workflows", () => {
    const fixtures = buildDemoWorkflowFixtures({
      now: new Date("2026-05-14T16:00:00.000Z"),
    });

    expect(fixtures.customers).toHaveLength(100);
    expect(fixtures.customers[0].locations).toHaveLength(2);
    expect(fixtures.technicians).toHaveLength(16);
    expect(fixtures.jobs).toHaveLength(180);
    expect(
      fixtures.jobs.filter((job) => !job.assigned_tech_id).length,
    ).toBeGreaterThanOrEqual(3);
    const assignedRoutableJobs = fixtures.jobs.filter(
      (job) => job.assigned_tech_id && job.status !== "canceled",
    );
    const jobsWithGpsEvidence = new Set(
      fixtures.geofenceEvents.map((event) => event.job_id),
    );

    expect(fixtures.geofenceEvents.length).toBeGreaterThan(250);
    expect(
      assignedRoutableJobs.filter((job) => !jobsWithGpsEvidence.has(job.id)),
    ).toHaveLength(3);
    expect(
      new Set(fixtures.geofenceEvents.map((event) => event.event_type)),
    ).toEqual(new Set(["arrival", "departure"]));
    expect(fixtures.inventory).toHaveLength(14);
    expect(
      fixtures.inventory.filter((item) => item.status === "archived"),
    ).toHaveLength(1);
    expect(
      fixtures.inventory
        .filter(
          (item) =>
            item.status === "active" &&
            item.reorder_level !== null &&
            item.current_stock <= item.reorder_level,
        )
        .map((item) => item.name),
    ).toEqual(
      expect.arrayContaining([
        "Demo - Ant Gel Bait Rotation A",
        "Demo - Crack and Crevice Dust",
        "Demo - Wasp Knockdown Aerosol",
      ]),
    );
    expect(fixtures.invoices).toHaveLength(5);
    expect(fixtures.closeoutSummaries).toContainEqual({
      chemicalLogs: 3,
      forms: 2,
      jobId: "00000000-0000-4000-8000-00000000e002",
      photos: 2,
      signatures: 1,
    });
    const completedAssignedIds = new Set(
      fixtures.jobs
        .filter((job) => job.status === "completed" && job.assigned_tech_id)
        .map((job) => job.id),
    );
    const productionReadySummaries = fixtures.closeoutSummaries.filter(
      (summary) =>
        completedAssignedIds.has(summary.jobId) &&
        summary.chemicalLogs > 0 &&
        summary.forms > 0 &&
        summary.photos > 0 &&
        summary.signatures > 0,
    );
    const billingQueue = buildBillingQueue(
      fixtures.jobs,
      fixtures.invoices,
      fixtures.closeoutSummaries,
    );

    expect(productionReadySummaries.length).toBeGreaterThan(20);
    expect(billingQueue.needsCaptures).toHaveLength(3);
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
    const harborJob = fixtures.jobs.find(
      (job) => job.id === "00000000-0000-4000-8000-00000000e001",
    );
    const recurringJob = fixtures.jobs.find((job) =>
      job.service_offering_id === "general_pest_quarterly"
    );
    const wdoJob = fixtures.jobs.find(
      (job) => job.service_offering_id === "wdo_escrow_inspection",
    );
    const customerIds = new Set(
      fixtures.customers.map((customer) => customer.id),
    );
    const locationIds = new Set(
      fixtures.customers.flatMap((customer) =>
        (customer.locations ?? []).map((location) => location.id),
      ),
    );
    const technicianIds = new Set(
      fixtures.technicians.map((technician) => technician.id),
    );

    expect(completedJob?.customer?.name).toBe("Demo - Rivera Cafe");
    expect(completedJob?.location?.nickname).toBe("Cafe");
    expect(completedJob?.assigned_technician?.display_name).toBe(
      "Demo - Eli Brooks",
    );
    expect(paidInvoice?.job?.id).toBe(completedJob?.id);
    expect(paidInvoice?.customer?.id).toBe(completedJob?.customer_id);
    expect(recurringJob).toMatchObject({
      billing_disposition: "included_in_recurring",
      service_cadence: "quarterly",
    });
    expect(wdoJob).toMatchObject({
      job_purpose: "inspection",
      service_family: "termite_wdo",
    });
    expect(paidInvoice?.payments?.[0]).toMatchObject({
      amount_cents: 14500,
      status: "succeeded",
    });
    expect(fixtures.formSubmissions[0].job?.id).toBe(completedJob?.id);
    expect(fixtures.chemicalLogs[0].chemical?.name).toBe(
      "Demo - Ant Gel Bait Rotation A",
    );
    expect(fixtures.media[0].signed_url).toBe(
      "/demo-media/demo-rivera-cafe-dry-storage.svg",
    );
    expect(fixtures.media.some((item) => item.media_type === "signature")).toBe(
      true,
    );
    expect(fixtures.geofenceEvents).toContainEqual(
      expect.objectContaining({
        event_type: "arrival",
        job_id: "00000000-0000-4000-8000-00000000e001",
        latitude: 32.7422,
        longitude: -117.1772,
        recorded_by: harborJob?.assigned_tech_id,
      }),
    );
    expect(fixtures.geofenceEvents).toContainEqual(
      expect.objectContaining({
        event_type: "departure",
        job_id: "00000000-0000-4000-8000-00000000e001",
        recorded_by: harborJob?.assigned_tech_id,
      }),
    );
    expect(
      fixtures.customers
        .flatMap((customer) => customer.locations ?? [])
        .every(
          (location) =>
            typeof location.latitude === "number" &&
            typeof location.longitude === "number",
        ),
    ).toBe(true);
    expect(fixtures.jobs.every((job) => customerIds.has(job.customer_id))).toBe(
      true,
    );
    expect(fixtures.jobs.every((job) => locationIds.has(job.location_id))).toBe(
      true,
    );
    expect(
      fixtures.jobs.every(
        (job) =>
          !job.assigned_tech_id || technicianIds.has(job.assigned_tech_id),
      ),
    ).toBe(true);
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
