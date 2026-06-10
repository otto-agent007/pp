import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  getClassificationAwareBillingGuidance,
  getClassificationAwareCloseoutGuidance,
  getCloseoutBillingRuleForJob,
  getCloseoutProofExpectationsForClassification,
  getInvoiceCreationWarningCopy,
  getPaymentCreationGuardrailForJob,
  shouldRequireInvoiceCreationConfirmation,
  shouldShowInvoiceCreationWarning,
} from "./closeoutBillingRules";

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
    status: "completed",
    updated_at: now,
    ...overrides,
  };
}

describe("closeout billing rules", () => {
  it("returns estimate review guidance for estimate-only jobs", () => {
    const rule = getCloseoutBillingRuleForJob(
      job({
        billing_disposition: "estimate_only",
        job_purpose: "estimate",
      }),
    );

    expect(rule).toMatchObject({
      action: "estimate_review",
      label: "Estimate",
      requiresConfirmation: true,
      severity: "warning",
      summary: "Estimate only — review before invoicing as completed service.",
    });
    expect(rule.guidanceItems).toContain("Proposed scope");
    expect(getPaymentCreationGuardrailForJob(job({ job_purpose: "estimate" })))
      .toMatchObject({ action: "estimate_review" });
  });

  it("requires recurring review when the service is included in a plan", () => {
    const rule = getCloseoutBillingRuleForJob(
      job({
        billing_disposition: "included_in_recurring",
        service_cadence: "quarterly",
        service_family: "recurring_general_pest",
      }),
    );

    expect(rule).toMatchObject({
      action: "recurring_review",
      label: "Recurring Service",
      requiresConfirmation: true,
      summary:
        "Included in recurring plan — verify account billing before creating a separate invoice.",
    });
    expect(rule.guidanceItems).toContain("Service checklist");
  });

  it("allows recurring billable jobs while keeping cadence guidance visible", () => {
    const recurring = job({
      billing_disposition: "billable",
      service_cadence: "monthly",
      service_family: "recurring_general_pest",
    });
    const rule = getCloseoutBillingRuleForJob(recurring);

    expect(rule).toMatchObject({
      action: "normal_invoice",
      label: "Recurring Service",
      requiresConfirmation: false,
    });
    expect(rule.guidanceItems[0]).toBe("Cadence: monthly");
    expect(getPaymentCreationGuardrailForJob(recurring)).toBeNull();
  });

  it("returns project review guidance for exclusion and deposit-required jobs", () => {
    const rule = getCloseoutBillingRuleForJob(
      job({
        billing_disposition: "deposit_required",
        job_purpose: "project_phase",
        service_cadence: "project",
        service_family: "rodent_attic",
        service_offering_id: "rodent_exclusion",
      }),
    );

    expect(rule).toMatchObject({
      action: "project_review",
      id: "project_deposit_review",
      label: "Exclusion / Project",
      requiresConfirmation: false,
      severity: "warning",
      summary:
        "Project/exclusion work — confirm scope and photo proof before invoice release.",
    });
    expect(rule.guidanceItems).toContain("Before photos");
    expect(rule.guidanceItems).toContain("After photos");
  });

  it("preserves WDO/Escrow review guidance without invoice confirmation", () => {
    const rule = getCloseoutBillingRuleForJob(
      job({
        job_purpose: "inspection",
        service_family: "termite_wdo",
        service_offering_id: "wdo_escrow_inspection",
      }),
    );

    expect(rule).toMatchObject({
      action: "wdo_review",
      label: "WDO / Escrow",
      requiresConfirmation: false,
      summary: "Confirm WDO/Escrow readiness before final document release.",
    });
    expect(rule.guidanceItems).toContain("Staff-side WDO/Escrow readiness review");
  });

  it("requires warranty callback and no-charge confirmation", () => {
    expect(
      getCloseoutBillingRuleForJob(
        job({
          billing_disposition: "warranty_callback",
          job_purpose: "warranty",
        }),
      ),
    ).toMatchObject({
      action: "warranty_review",
      label: "Warranty / Callback",
      requiresConfirmation: true,
    });

    expect(
      getCloseoutBillingRuleForJob(
        job({
          billing_disposition: "no_charge",
          job_purpose: "callback",
        }),
      ),
    ).toMatchObject({
      action: "no_invoice_expected",
      requiresConfirmation: true,
    });
  });

  it("returns follow-up and inspection review guidance without hard blocking", () => {
    const rule = getCloseoutBillingRuleForJob(job({ job_purpose: "follow_up" }));

    expect(rule).toMatchObject({
      action: "review_before_invoice",
      label: "Follow-up / Inspection",
      requiresConfirmation: false,
      summary: "Inspection/follow-up — verify billing disposition before invoicing.",
    });
    expect(getCloseoutProofExpectationsForClassification(ruleJob("inspection")))
      .toContain("Findings");
  });

  it("keeps standard billable and legacy jobs on the normal invoice path", () => {
    const standard = job({
      billing_disposition: "billable",
      job_purpose: "service",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
    });
    const legacy = job();

    expect(getCloseoutBillingRuleForJob(standard)).toMatchObject({
      action: "normal_invoice",
      id: "standard_billable",
      requiresConfirmation: false,
    });
    expect(getCloseoutBillingRuleForJob(legacy)).toMatchObject({
      action: "normal_invoice",
      requiresConfirmation: false,
    });
    expect(shouldShowInvoiceCreationWarning(standard)).toBe(false);
    expect(getClassificationAwareBillingGuidance(standard)).toBeNull();
    expect(getClassificationAwareCloseoutGuidance(standard)).toBeNull();
  });

  it("exposes explicit warning and confirmation helpers for review-required jobs", () => {
    const estimate = job({ job_purpose: "estimate" });
    const recurring = job({ service_offering_id: "general_pest_quarterly" });
    const warranty = job({ billing_disposition: "warranty_callback" });
    const standard = job({ service_offering_id: "general_pest_initial" });

    expect(shouldRequireInvoiceCreationConfirmation(estimate)).toBe(true);
    expect(shouldRequireInvoiceCreationConfirmation(recurring)).toBe(true);
    expect(shouldRequireInvoiceCreationConfirmation(warranty)).toBe(true);
    expect(shouldRequireInvoiceCreationConfirmation(standard)).toBe(false);
    expect(getInvoiceCreationWarningCopy(estimate)).toBe(
      "Estimate only — review before invoicing as completed service.",
    );
  });

  it("keeps customer-safe summaries free of internal fields and guardrail copy", () => {
    const serialized = JSON.stringify(
      [
        getCloseoutBillingRuleForJob(job({ job_purpose: "estimate" })),
        getCloseoutBillingRuleForJob(
          job({
            job_purpose: "inspection",
            service_family: "termite_wdo",
            service_offering_id: "wdo_escrow_inspection",
          }),
        ),
      ].map((rule) => rule.customerSafeSummary),
    );

    expect(serialized).not.toMatch(/billing_disposition|estimate_only/i);
    expect(serialized).not.toMatch(/final document release/i);
    expect(serialized).not.toMatch(/internal compliance|provider|gps/i);
  });
});

function ruleJob(job_purpose: Job["job_purpose"]): Job {
  return job({ job_purpose });
}
