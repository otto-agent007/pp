import { describe, expect, it } from "vitest";
import type { ComplianceGuardrail } from "./compliance";
import type {
  Invoice,
  Job,
  JobCloseoutReview,
  TechnicianLicense,
} from "@pest-patrol/types";
import {
  buildWdoEscrowClearanceQueue,
  buildWdoEscrowReadinessForJob,
  getWdoEscrowClearanceSummary,
  isWdoEscrowLikeJob,
} from "./wdoEscrowClearance";

const now = "2026-06-04T12:00:00.000Z";
const customer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: "555-0100",
  email: "office@example.test",
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const location = {
  id: "location-1",
  customer_id: customer.id,
  address: "10 Pine Street",
  nickname: null,
  service_notes: null,
  is_primary: true,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-wdo",
    customer_id: customer.id,
    location_id: location.id,
    assigned_tech_id: "tech-1",
    scheduled_start: "2026-06-04T09:00:00.000Z",
    scheduled_end: null,
    status: "completed",
    service_notes:
      "WDO escrow Branch 3 inspection for damaged members, findings, recommendations, and clearance review.",
    created_at: now,
    updated_at: now,
    customer,
    location,
    ...overrides,
  };
}

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "invoice-1",
    job_id: "job-wdo",
    customer_id: customer.id,
    status: "paid",
    currency: "usd",
    subtotal_cents: 45000,
    total_cents: 45000,
    due_date: null,
    notes: null,
    payment_url: null,
    stripe_payment_link_id: null,
    created_at: now,
    updated_at: now,
    job: job(),
    customer,
    line_items: [],
    payments: [],
    ...overrides,
  };
}

function closeoutReview(inputJob = job()): JobCloseoutReview {
  return {
    job: inputJob,
    chemical_logs: [],
    form_submissions: [
      {
        id: "submission-1",
        job_id: inputJob.id,
        template_id: "template-1",
        form_data: {
          damaged_members:
            "Sill plate shows damaged members and drywood evidence.",
          recommendations:
            "Recommend localized treatment and repair follow-up before clearance.",
        },
        submitted_by: "tech-1",
        submitted_at: now,
        created_at: now,
        updated_at: now,
        template: {
          id: "template-1",
          name: "WDO inspection report draft",
          version: 1,
          status: "active",
          created_at: now,
          updated_at: now,
          schema: { fields: [] },
        },
      },
    ],
    media: [],
    photos: [
      {
        id: "photo-1",
        job_id: inputJob.id,
        media_type: "photo",
        storage_bucket: "job-media",
        storage_path: "job-wdo/damaged-member.jpg",
        signed_url: null,
        description: "Damaged member photo",
        uploaded_by: "tech-1",
        captured_at: now,
        created_at: now,
        updated_at: now,
      },
    ],
    signatures: [],
  };
}

function branch3License(
  overrides: Partial<TechnicianLicense> = {},
): TechnicianLicense {
  return {
    id: "license-1",
    technician_id: "tech-1",
    license_type: "operator",
    branch: "branch_3",
    license_number: "BR3-123",
    issuing_authority: "spcb",
    status: "active",
    expires_at: "2026-12-31",
    notes: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function guardrail(
  status: ComplianceGuardrail["status"] = "clear",
): ComplianceGuardrail {
  return {
    items:
      status === "clear"
        ? []
        : [
            {
              category: "wdo",
              description: "Review item",
              id: "review-1",
              jobId: "job-wdo",
              missingEvidence: ["Report evidence"],
              nextAction: "Review records",
              severity: status === "critical" ? "critical" : "warning",
              status: "open",
              title: "WDO review",
              workflow: "wdo_branch3",
            },
          ],
    jobId: "job-wdo",
    label:
      status === "critical" ? "Critical compliance review" : "Compliance clear",
    nextStep: "Review records",
    status,
    summary:
      status === "critical"
        ? "operator review required for critical item with missing evidence."
        : "No missing evidence review items are linked to this job.",
  };
}

describe("WDO escrow clearance readiness", () => {
  it("infers termite and WDO escrow jobs from existing service text", () => {
    expect(isWdoEscrowLikeJob(job())).toBe(true);
    expect(
      isWdoEscrowLikeJob(
        job({
          id: "job-termite",
          service_notes: "Termite localized treatment with drywood findings.",
        }),
      ),
    ).toBe(true);
  });

  it("excludes non-WDO general pest work", () => {
    expect(
      isWdoEscrowLikeJob(
        job({
          id: "job-general",
          service_notes: "Quarterly general pest service for ants and spiders.",
        }),
      ),
    ).toBe(false);
  });

  it("marks missing photos forms findings and recommendations as needs evidence", () => {
    const item = buildWdoEscrowReadinessForJob({
      closeoutSummary: {
        chemicalLogs: 0,
        forms: 0,
        jobId: "job-wdo",
        photos: 0,
        signatures: 0,
      },
      complianceGuardrail: guardrail("clear"),
      invoice: invoice(),
      job: job({ service_notes: "WDO escrow Branch 3 inspection." }),
      technicianLicenses: [branch3License()],
    });

    expect(item.status).toBe("needs_evidence");
    expect(item.missingEvidenceLabels).toEqual(
      expect.arrayContaining([
        "Inspection/report form",
        "Findings/damaged-member evidence",
        "Recommendations/follow-up disposition",
        "Photos",
      ]),
    );
    expect(item.nextAction).toContain("missing evidence");
  });

  it("prioritizes critical compliance guardrails as operator review", () => {
    const item = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("critical"),
      invoice: invoice(),
      job: job(),
      technicianLicenses: [branch3License()],
    });

    expect(item.status).toBe("needs_operator_review");
    expect(item.nextAction).toContain("Operator review required");
  });

  it("uses Branch 3 credential readiness when technician license data exists", () => {
    const item = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("clear"),
      invoice: invoice(),
      job: job(),
      technicianLicenses: [],
    });

    expect(item.status).toBe("needs_operator_review");
    expect(
      item.readinessItems.find(
        (current) => current.id === "branch_3_credential",
      ),
    ).toMatchObject({
      detail: "credential review required",
      status: "needs_review",
    });
  });

  it("uses invoice sent and paid state for billing readiness labels", () => {
    const sentItem = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("clear"),
      invoice: invoice({ status: "sent" }),
      job: job(),
      technicianLicenses: [branch3License()],
    });
    const paidItem = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("clear"),
      invoice: invoice({ status: "paid" }),
      job: job(),
      technicianLicenses: [branch3License()],
    });

    expect(sentItem.status).toBe("needs_billing_review");
    expect(sentItem.invoiceLabel).toContain("Awaiting payment");
    expect(paidItem.invoiceLabel).toContain("Manually marked paid");
  });

  it("marks complete evidence as ready for draft but not released", () => {
    const item = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("clear"),
      invoice: invoice({ status: "paid" }),
      job: job(),
      technicianLicenses: [branch3License()],
    });

    expect(item.status).toBe("ready_for_draft");
    expect(item.status).not.toBe("released");
    expect(item.nextAction).toContain("draft clearance");
  });

  it("summarizes WDO queue statuses", () => {
    const queue = buildWdoEscrowClearanceQueue({
      closeoutReviews: [closeoutReview()],
      complianceGuardrails: new Map([["job-wdo", guardrail("clear")]]),
      invoices: [invoice()],
      jobs: [
        job(),
        job({
          id: "job-general",
          service_notes: "Quarterly general pest service.",
        }),
      ],
      technicianLicenses: [branch3License()],
    });

    expect(queue).toHaveLength(1);
    expect(getWdoEscrowClearanceSummary(queue)).toEqual({
      needsBillingReview: 0,
      needsEvidence: 0,
      needsOperatorReview: 0,
      readyForDraft: 1,
      released: 0,
      totalWdoJobs: 1,
    });
  });

  it("requires human approval copy and avoids forbidden compliance terms", () => {
    const item = buildWdoEscrowReadinessForJob({
      closeoutReview: closeoutReview(),
      complianceGuardrail: guardrail("clear"),
      invoice: invoice(),
      job: job(),
      technicianLicenses: [branch3License()],
    });
    const copy = [
      item.statusLabel,
      item.nextAction,
      item.documentHandoffNote,
      item.readinessItems.map((current) => current.detail).join(" "),
    ].join(" ");

    expect(copy).toMatch(/final release requires authorized human review/i);
    expect(copy).toMatch(/readiness|review|draft clearance|final release/i);
    expect(copy.toLowerCase()).not.toMatch(
      /violation|illegal|guaranteed compliant/,
    );
  });
});
