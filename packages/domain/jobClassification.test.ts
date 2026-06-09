import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  getJobClassificationBadge,
  getJobClassificationBillingGuidance,
  getJobClassificationCloseoutGuidance,
  getJobClassificationLabel,
  getJobClassificationTechSummary,
  inferJobClassificationFromServiceOffering,
  isBillableJob,
  isEstimateJob,
  isExclusionJob,
  isRecurringJob,
  isWdoEscrowJob,
  normalizeJobClassification,
  shouldOfferInvoiceForJob,
} from "./jobClassification";

const now = "2026-06-09T12:00:00Z";

function job(overrides: Partial<Job> = {}): Job {
  return {
    assigned_tech_id: null,
    created_at: now,
    customer_id: "customer-1",
    id: "job-1",
    location_id: "location-1",
    scheduled_end: null,
    scheduled_start: now,
    service_notes: null,
    status: "scheduled",
    updated_at: now,
    ...overrides,
  };
}

describe("job classification", () => {
  it("normalizes legacy jobs to safe service defaults", () => {
    expect(normalizeJobClassification(job())).toEqual({
      billing_disposition: "billable",
      estimate_status: "not_applicable",
      job_purpose: "service",
      parent_job_id: null,
      service_cadence: "one_time",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
    });
  });

  it.each([
    ["general_pest_monthly", "monthly"],
    ["general_pest_bimonthly", "bimonthly"],
    ["general_pest_quarterly", "quarterly"],
  ] as const)("maps %s to recurring service cadence", (offeringId, cadence) => {
    const classification = inferJobClassificationFromServiceOffering(offeringId);

    expect(classification).toMatchObject({
      billing_disposition: "included_in_recurring",
      job_purpose: "service",
      service_cadence: cadence,
      service_family: "recurring_general_pest",
    });
    expect(isRecurringJob(classificationJob(classification))).toBe(true);
    expect(getJobClassificationLabel(classification)).toBe("Recurring Service");
  });

  it("maps rodent exclusion to project-style exclusion work", () => {
    const classification =
      inferJobClassificationFromServiceOffering("rodent_exclusion");

    expect(classification).toMatchObject({
      billing_disposition: "billable",
      job_purpose: "project_phase",
      service_cadence: "project",
      service_family: "rodent_attic",
    });
    expect(getJobClassificationBadge(classification)).toMatchObject({
      label: "Exclusion",
      prominent: true,
    });
    expect(isExclusionJob(classificationJob(classification))).toBe(true);
  });

  it("maps WDO escrow inspections to office-review inspection work", () => {
    const classification = inferJobClassificationFromServiceOffering(
      "wdo_escrow_inspection",
    );

    expect(classification).toMatchObject({
      billing_disposition: "billable",
      job_purpose: "inspection",
      service_family: "termite_wdo",
    });
    expect(getJobClassificationLabel(classification)).toBe("WDO / Escrow");
    expect(getJobClassificationCloseoutGuidance(classification)?.summary).toBe(
      "Office review required before final document release.",
    );
    expect(isWdoEscrowJob(classificationJob(classification))).toBe(true);
  });

  it("maps estimate jobs to estimate-only billing and friendly copy", () => {
    const estimate = job({ job_purpose: "estimate" });
    const classification = normalizeJobClassification(estimate);

    expect(classification.billing_disposition).toBe("estimate_only");
    expect(classification.estimate_status).toBe("draft");
    expect(getJobClassificationLabel(classification)).toBe("Estimate");
    expect(getJobClassificationTechSummary(classification)).not.toMatch(
      /billing_disposition|service_offering_id|inferred preset/i,
    );
    expect(isEstimateJob(estimate)).toBe(true);
    expect(shouldOfferInvoiceForJob(estimate)).toBe(false);
  });

  it("surfaces warranty and callback billing guidance without hard blocking", () => {
    const warranty = job({ job_purpose: "warranty" });
    const callback = job({ job_purpose: "callback", billing_disposition: "no_charge" });

    expect(normalizeJobClassification(warranty).billing_disposition).toBe(
      "warranty_callback",
    );
    expect(
      getJobClassificationBillingGuidance(normalizeJobClassification(warranty))
        ?.summary,
    ).toMatch(/Warranty or callback handling expected/i);
    expect(
      getJobClassificationBadge(normalizeJobClassification(callback)),
    ).toMatchObject({
      label: "Callback",
      prominent: true,
    });
  });

  it("keeps invoices conservative for recurring and estimate-only jobs", () => {
    const recurring = job({ service_offering_id: "general_pest_quarterly" });
    const billable = job({ service_offering_id: "general_pest_initial" });

    expect(shouldOfferInvoiceForJob(recurring)).toBe(false);
    expect(getJobClassificationBillingGuidance(recurring)?.summary).toBe(
      "Included in recurring plan - verify account billing before creating a separate invoice.",
    );
    expect(shouldOfferInvoiceForJob(billable)).toBe(true);
    expect(isBillableJob(billable)).toBe(true);
  });
});

function classificationJob(
  classification: ReturnType<typeof normalizeJobClassification>,
): Job {
  return job(classification);
}
