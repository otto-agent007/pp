import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildComplianceGuardrailForJob,
  getComplianceGuardrailSummary,
  getComplianceNeedsReviewSummary,
  type ComplianceNeedsReviewSummary,
  type ComplianceReviewItem,
} from "@pest-patrol/domain";
import type {
  CloseoutCaptureSummary,
  Invoice,
  Job,
  TechnicianLicense,
} from "@pest-patrol/types";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
import { useComplianceReviewItems } from "../../hooks/useComplianceReviewItems";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";
import { useTechnicianLicenses } from "../../hooks/useTechnicians";
import { EscrowReClient } from "./escrow-re-client";

const searchParams = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock("../../hooks/useCloseouts", () => ({
  useCloseoutCaptureSummaries: vi.fn(),
}));

vi.mock("../../hooks/useComplianceReviewItems", () => ({
  useComplianceReviewItems: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/usePayments", () => ({
  useInvoices: vi.fn(),
}));

vi.mock("../../hooks/useTechnicians", () => ({
  useTechnicianLicenses: vi.fn(),
}));

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

function job(
  id: string,
  service_notes: string,
  overrides: Partial<Job> = {},
): Job {
  return {
    id,
    customer_id: customer.id,
    location_id: location.id,
    assigned_tech_id: "tech-1",
    scheduled_start: "2026-06-04T09:00:00.000Z",
    scheduled_end: null,
    status: "completed",
    service_notes,
    created_at: now,
    updated_at: now,
    customer,
    location: {
      ...location,
      address:
        id === "job-ready"
          ? "40 Market Street"
          : id === "job-needs"
            ? "50 Palm Avenue"
            : "60 Cedar Road",
    },
    ...overrides,
  };
}

const readyJob = job(
  "job-ready",
  "WDO escrow Branch 3 inspection with findings, damaged members, recommendations, and clearance review.",
);
const needsEvidenceJob = job(
  "job-needs",
  "WDO escrow Branch 3 inspection.",
);
const generalJob = job("job-general", "Quarterly general pest service.");

function invoice(inputJob: Job, status: Invoice["status"] = "paid"): Invoice {
  return {
    id: `invoice-${inputJob.id}`,
    job_id: inputJob.id,
    customer_id: inputJob.customer_id,
    status,
    currency: "usd",
    subtotal_cents: 45000,
    total_cents: 45000,
    due_date: null,
    notes: null,
    payment_url: null,
    stripe_payment_link_id: null,
    created_at: now,
    updated_at: now,
    job: inputJob,
    customer,
    line_items: [],
    payments: [],
  };
}

function summary(jobId: string, forms: number, photos: number) {
  return {
    chemicalLogs: 0,
    forms,
    jobId,
    photos,
    signatures: 0,
  } satisfies CloseoutCaptureSummary;
}

const branch3License: TechnicianLicense = {
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
};

function queryResult(data: unknown = [], error: unknown = null) {
  return {
    data,
    error,
    isLoading: false,
  } as never;
}

function mockComplianceReview(items: ComplianceReviewItem[] = []) {
  vi.mocked(useComplianceReviewItems).mockReturnValue({
    buildGuardrailForJob: (jobId: string) =>
      buildComplianceGuardrailForJob({ items, jobId }),
    guardrailByJobId: (jobIds: string[]) =>
      new Map(
        Array.from(new Set(jobIds)).map((jobId) => [
          jobId,
          buildComplianceGuardrailForJob({ items, jobId }),
        ]),
      ),
    guardrailSummaryForJobs: (jobIds: string[]) =>
      getComplianceGuardrailSummary({ items, jobIds }),
    isError: false,
    isLoading: false,
    items,
    schemaUnavailable: false,
    setupReadiness: null,
    setupWarning: null,
    summary: getComplianceNeedsReviewSummary(
      items,
    ) as ComplianceNeedsReviewSummary,
  });
}

describe("EscrowReClient", () => {
  beforeEach(() => {
    searchParams.value = new URLSearchParams();
    vi.mocked(useJobs).mockReturnValue(
      queryResult([readyJob, needsEvidenceJob, generalJob]),
    );
    vi.mocked(useInvoices).mockReturnValue(
      queryResult([invoice(readyJob), invoice(needsEvidenceJob, "sent")]),
    );
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue(
      queryResult([
        summary("job-ready", 1, 1),
        summary("job-needs", 0, 0),
      ]),
    );
    vi.mocked(useTechnicianLicenses).mockReturnValue({
      data: [branch3License],
      error: null,
      isLoading: false,
      schemaUnavailable: false,
      setupWarning: null,
    } as never);
    mockComplianceReview();
  });

  it("renders the WDO readiness queue, summary, and workspace links", () => {
    render(<EscrowReClient />);

    expect(
      screen.getByRole("heading", { name: "WDO / Escrow Clearance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /WDO jobs found\s+2/ }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Ready for draft" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Needs evidence" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Needs operator review" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Needs billing review" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("40 Market Street").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50 Palm Avenue").length).toBeGreaterThan(0);
    expect(screen.queryByText("Quarterly general pest service.")).not.toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "Closeout" })[0]).toHaveAttribute(
      "href",
      "/closeouts?job_id=job-ready",
    );
    expect(screen.getAllByRole("link", { name: "Payments" })[0]).toHaveAttribute(
      "href",
      "/payments?job_id=job-ready",
    );
    expect(screen.getAllByRole("link", { name: "Customer" })[0]).toHaveAttribute(
      "href",
      "/customers?customer_id=customer-1",
    );
    expect(screen.getAllByRole("link", { name: "Compliance" })[0]).toHaveAttribute(
      "href",
      "/compliance",
    );
    expect(
      screen.getAllByText("Final release requires authorized human review.")
        .length,
    ).toBeGreaterThan(0);
  });

  it("filters queue cards by readiness status", async () => {
    const user = userEvent.setup();
    render(<EscrowReClient />);

    const filters = screen.getByLabelText("WDO readiness filters");
    await user.click(
      within(filters).getByRole("button", { name: "Needs evidence" }),
    );

    expect(screen.queryByText("40 Market Street")).not.toBeInTheDocument();
    expect(screen.getAllByText("50 Palm Avenue").length).toBeGreaterThan(0);
  });

  it("preselects the job_id query parameter when the job is WDO-like", () => {
    searchParams.value = new URLSearchParams("job_id=job-needs");

    render(<EscrowReClient />);

    expect(
      screen.getByRole("heading", { name: "Apex Homes", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("50 Palm Avenue").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Inspection\/report form or draft is missing/),
    ).toBeInTheDocument();
  });

  it("shows critical compliance as operator review", () => {
    const criticalItem: ComplianceReviewItem = {
      category: "wdo",
      description: "Review item",
      id: "critical-wdo",
      jobId: "job-ready",
      missingEvidence: ["Report evidence"],
      nextAction: "Review records",
      severity: "critical",
      status: "open",
      title: "WDO critical review",
      workflow: "wdo_branch3",
    };
    mockComplianceReview([criticalItem]);

    render(<EscrowReClient />);

    expect(screen.getAllByText("Operator review required").length).toBeGreaterThan(
      0,
    );
  });
});
