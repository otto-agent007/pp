import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildComplianceGuardrailForJob,
  buildComplianceReviewItems,
  getComplianceGuardrailSummary,
  getComplianceNeedsReviewSummary,
} from "@pest-patrol/domain";
import type { ChemicalLog, Job } from "@pest-patrol/types";

import {
  useCloseoutCaptureSummaries,
  useJobCloseoutReview,
} from "../../hooks/useCloseouts";
import { useComplianceReviewItems } from "../../hooks/useComplianceReviewItems";
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";
import { useTechnicianLicenses } from "../../hooks/useTechnicians";
import { CloseoutsClient } from "./closeouts-client";

vi.mock("../../hooks/useCloseouts", () => ({
  useCloseoutCaptureSummaries: vi.fn(),
  useJobCloseoutReview: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/useComplianceReviewItems", () => ({
  useComplianceReviewItems: vi.fn(),
}));

vi.mock("../../hooks/useGeofencing", () => ({
  useJobGeofenceEvents: vi.fn(),
}));

vi.mock("../../hooks/usePayments", () => ({
  useInvoices: vi.fn(),
}));

vi.mock("../../hooks/useTechnicians", () => ({
  useTechnicianLicenses: vi.fn(),
}));

const now = "2026-05-05T00:00:00Z";
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
const location = {
  id: "location-1",
  customer_id: "customer-1",
  address: "10 Pine Street",
  nickname: null,
  service_notes: null,
  is_primary: true,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const completedJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: "tech-1",
  scheduled_start: "2026-05-06T09:38:00Z",
  scheduled_end: null,
  status: "completed",
  service_notes: "Interior treatment",
  created_at: now,
  updated_at: now,
  customer,
  location,
} as const;
const wdoJob = {
  ...completedJob,
  id: "job-wdo",
  service_notes:
    "WDO escrow Branch 3 termite inspection with findings, damaged member evidence, inaccessible areas, recommendations, and follow-up disposition",
  location: {
    ...location,
    id: "location-wdo",
    address: "40 Market Street",
  },
} as const;
const scheduledJob = {
  ...completedJob,
  id: "job-2",
  status: "scheduled",
  service_notes: "Upcoming service",
} as const;
const needsCapturesJob = {
  ...completedJob,
  id: "job-needs",
  scheduled_start: "2026-05-04T09:00:00Z",
  service_notes: "Needs signature",
  location: {
    ...location,
    address: "20 Oak Avenue",
  },
} as const;
const invoicedJob = {
  ...completedJob,
  id: "job-invoiced",
  scheduled_start: "2026-05-03T09:00:00Z",
  service_notes: "Already billed",
  location: {
    ...location,
    address: "30 Cedar Road",
  },
} as const;
const invoice = {
  id: "invoice-1",
  job_id: "job-invoiced",
  customer_id: "customer-1",
  status: "sent",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: null,
  notes: null,
  payment_url: "https://pay.example/invoice-1",
  stripe_payment_link_id: null,
  created_at: "2026-05-06T00:00:00Z",
  updated_at: "2026-05-06T00:00:00Z",
  payments: [],
} as const;
const arrivalEvent = {
  id: "event-arrival",
  job_id: "job-1",
  event_type: "arrival",
  latitude: 33.8121,
  longitude: -117.919,
  accuracy_m: 12,
  distance_m: 80,
  within_radius: true,
  recorded_by: "tech-1",
  client_event_id: "00000000-0000-4000-8000-000000000301",
  captured_at: "2026-05-06T09:05:00.000Z",
  created_at: "2026-05-06T09:05:00.000Z",
} as const;
const departureEvent = {
  ...arrivalEvent,
  id: "event-departure",
  event_type: "departure",
  client_event_id: "00000000-0000-4000-8000-000000000302",
  captured_at: "2026-05-06T09:50:00.000Z",
  created_at: "2026-05-06T09:50:00.000Z",
} as const;
const review = {
  job: completedJob,
  form_submissions: [
    {
      id: "submission-1",
      job_id: "job-1",
      template_id: "template-1",
      form_data: {
        target_pests: "Ants",
        follow_up_required: true,
      },
      submitted_by: "tech-1",
      submitted_at: now,
      created_at: now,
      updated_at: now,
      template: {
        id: "template-1",
        name: "Treatment Form",
        version: 1,
        status: "active",
        created_at: now,
        updated_at: now,
        schema: {
          fields: [
            {
              id: "target_pests",
              label: "Target pests",
              type: "textarea",
            },
            {
              id: "follow_up_required",
              label: "Follow-up required",
              type: "boolean",
            },
          ],
        },
      },
    },
  ],
  chemical_logs: [
    {
      id: "log-1",
      job_id: "job-1",
      chemical_id: "chemical-1",
      amount_used: 2,
      notes: "Kitchen baseboards",
      created_at: now,
      chemical: {
        id: "chemical-1",
        name: "Bait Gel",
        epa_number: "EPA-123",
        current_stock: 10,
        unit: "oz",
        reorder_level: 4,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    },
  ],
  media: [],
  photos: [
    {
      id: "media-1",
      job_id: "job-1",
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: "job-1/photo.jpg",
      signed_url: "https://signed.example/photo.jpg",
      description: "Kitchen photo",
      uploaded_by: "tech-1",
      captured_at: now,
      created_at: now,
      updated_at: now,
    },
  ],
  signatures: [
    {
      id: "media-2",
      job_id: "job-1",
      media_type: "signature",
      storage_bucket: "job-media",
      storage_path: "job-1/signature.png",
      signed_url: "https://signed.example/signature.png",
      description: "Signed by Jamie",
      uploaded_by: "tech-1",
      captured_at: now,
      created_at: now,
      updated_at: now,
    },
  ],
} as const;
const warningChemicalLog = {
  id: "log-warning",
  job_id: "job-1",
  chemical_id: "chemical-1",
  amount_used: 2,
  notes: "Kitchen baseboards",
  created_at: now,
  chemical: {
    id: "chemical-1",
    name: "Bait Gel",
    epa_number: "EPA-123",
    current_stock: 10,
    unit: "oz",
    reorder_level: 4,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  job: completedJob,
} as const;
const criticalChemicalLog = {
  ...warningChemicalLog,
  id: "log-critical",
  job_id: "job-needs",
  amount_used: 0,
  chemical: {
    ...warningChemicalLog.chemical,
    epa_number: null,
    name: "",
    unit: "",
  },
  job: needsCapturesJob,
} as const;

function mockComplianceReview(
  chemicalLogs: ChemicalLog[] = [],
  jobs: Job[] = [
    completedJob,
    needsCapturesJob,
    invoicedJob,
    scheduledJob,
  ] as Job[],
  overrides: Partial<ReturnType<typeof useComplianceReviewItems>> = {},
) {
  const items = buildComplianceReviewItems({
    audits: [],
    chemicalLogs,
    chunks: [],
    documents: [],
    jobs,
    sources: [],
  });

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
    summary: getComplianceNeedsReviewSummary(items),
    ...overrides,
  });
}

describe("CloseoutsClient", () => {
  beforeEach(() => {
    window.history.pushState(null, "", "/closeouts");
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, needsCapturesJob, invoicedJob, scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [invoice],
      isLoading: false,
    } as never);
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [
        fullSummary("job-1"),
        { ...fullSummary("job-needs"), photos: 0, signatures: 0 },
        fullSummary("job-invoiced"),
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    mockComplianceReview();
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review,
    } as never);
    vi.mocked(useJobGeofenceEvents).mockReturnValue({
      data: [arrivalEvent, departureEvent],
      isLoading: false,
    } as never);
    vi.mocked(useTechnicianLicenses).mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      schemaUnavailable: false,
    } as never);
  });

  it("renders closeout captures for the selected completed job", () => {
    render(<CloseoutsClient />);

    expect(
      screen.getByRole("heading", { name: "Closeouts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Completed jobs grouped by closeout readiness. Open one to review captures or create an invoice.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Next action")).toBeInTheDocument();
    expect(screen.getByText("Proof handoff")).toBeInTheDocument();
    expect(screen.getByText("Compliance review")).toBeInTheDocument();
    expect(screen.getByText("Job details")).toBeInTheDocument();
    expect(screen.getAllByText("Ready to bill").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs captures").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("WDO / Escrow readiness"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Invoiced (1)")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Queue section Ready to bill"),
    ).toHaveAttribute("open");
    expect(
      screen.getByLabelText("Queue section Needs captures"),
    ).not.toHaveAttribute("open");
    expect(
      screen.getByLabelText("Queue section Invoiced"),
    ).not.toHaveAttribute("open");
    expect(screen.getByText("Total completed")).toBeInTheDocument();
    expect(screen.queryByText("Compliance advisory")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open compliance" }),
    ).toHaveAttribute("href", "/compliance");
    expect(screen.getByText("Proof handoff readiness")).toBeInTheDocument();
    expect(
      screen.getByText("Ready for office proof review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Arrival and departure GPS synced for office review"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Portal handoff ready after office review"),
    ).toBeInTheDocument();
    expect(screen.getByText("Arrival GPS captured")).toBeInTheDocument();
    expect(screen.getByText("Departure GPS captured")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("High sync confidence")).toBeInTheDocument();
    expect(screen.getByText("No invoice yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Customer portal can show reviewed service forms, photos, signatures, service date, and location; exact technician GPS stays private.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Missing: photo · signature")).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("Treatment Form")).toBeInTheDocument();
    expect(screen.getByText("Ants")).toBeInTheDocument();
    expect(screen.getByText("Bait Gel")).toBeInTheDocument();
    expect(screen.getByText("Kitchen photo")).toBeInTheDocument();
    expect(screen.getByText("Signed by Jamie")).toBeInTheDocument();
    expect(screen.getAllByText(/May 6, 2026, 9:38 AM/).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/2:38 AM/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Ready to bill").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Treatment form, chemical log, photo, and signature are captured.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Location evidence")).toBeInTheDocument();
    expect(screen.getByText("Billing captures")).toBeInTheDocument();
    expect(
      screen.getByText("All proof captured. Create invoice to close out."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Invoice will include GPS + form evidence."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create invoice" }),
    ).toHaveAttribute("href", "/payments?job_id=job-1");
    expect(
      screen.getByRole("link", { name: "Open customer ledger" }),
    ).toHaveAttribute("href", "/customers?customer_id=customer-1");
  });

  it("links WDO-like selected jobs to the escrow readiness workspace", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [wdoJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [fullSummary("job-wdo")],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review: { ...review, job: wdoJob },
    } as never);
    mockComplianceReview([], [wdoJob] as Job[]);

    render(<CloseoutsClient />);

    expect(screen.getByText("WDO / Escrow readiness")).toBeInTheDocument();
    expect(screen.getByText("Job classification")).toBeInTheDocument();
    expect(screen.getAllByText("WDO / Escrow").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Office review required before final document release."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Final release requires authorized human review."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open WDO / Escrow readiness" }),
    ).toHaveAttribute("href", "/escrow-re?job_id=job-wdo");
  });

  it("surfaces warning and critical compliance guardrails for closeouts", async () => {
    const user = userEvent.setup();
    mockComplianceReview([
      warningChemicalLog as ChemicalLog,
      criticalChemicalLog as unknown as ChemicalLog,
    ]);

    render(<CloseoutsClient />);

    expect(
      screen.getByText("1 clear, 1 review recommended, 1 critical review."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Compliance review recommended").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Bait Gel chemical review")).toBeInTheDocument();
    expect(screen.getByText("License or supervision detail")).toBeInTheDocument();

    await user.click(screen.getByText("Needs captures (1)"));
    await user.click(screen.getByText("20 Oak Avenue"));

    expect(
      screen.getAllByText("Critical compliance review").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Chemical application review")).toBeInTheDocument();
    expect(screen.getByText("Product name")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Open compliance" }).length,
    ).toBeGreaterThan(0);
  });

  it("keeps closeouts usable when compliance review setup is unavailable", () => {
    mockComplianceReview([], undefined, {
      isError: false,
      items: [],
      schemaUnavailable: true,
      setupWarning:
        "Compliance advisory review data is unavailable. Continue the workflow, then review compliance setup from the Compliance page.",
      summary: {
        advisoryItems: 0,
        chemicalItems: 0,
        criticalItems: 0,
        openItems: 0,
        sourceItems: 0,
        warningItems: 0,
        wdoItems: 0,
      },
    });

    render(<CloseoutsClient />);

    expect(
      screen.getByRole("heading", { name: "Closeouts" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Compliance advisory")).not.toBeInTheDocument();
    expect(screen.queryByText(/relation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/compliance_sources/i)).not.toBeInTheDocument();
  });

  it("points invoiced closeouts toward portal sharing", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    await user.click(screen.getByText("Invoiced (1)"));
    await user.click(screen.getByText("30 Cedar Road"));

    expect(screen.getByRole("link", { name: "Share portal" })).toHaveAttribute(
      "href",
      "/customers?customer_id=customer-1",
    );
    expect(
      screen.getByText(
        "Awaiting customer payment. No action needed until paid or overdue.",
      ),
    ).toBeInTheDocument();
  });

  it("filters to completed jobs by default and can show all jobs", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    expect(screen.queryByText("Upcoming service")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Queue status"), "all");

    const otherJobRow = screen.getByText("Upcoming service").closest("button");

    if (!otherJobRow) {
      throw new Error("Expected other job row to render as a button");
    }

    expect(within(otherJobRow).getByText(/May 6, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Upcoming service")).toBeInTheDocument();
  });

  it("renders an empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    await user.type(screen.getByLabelText("Search closeouts"), "missing");

    expect(screen.getByText("No billing work found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Clear the search, show all jobs, or wait for completed jobs to reach the queue.",
      ),
    ).toBeInTheDocument();
  });

  it("guides users when no completed jobs are ready for closeout", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review: null,
    } as never);

    render(<CloseoutsClient />);

    expect(screen.getByText("No billing work found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No completed jobs yet. As technicians finish jobs in dispatch, they will appear here.",
      ),
    ).toBeInTheDocument();
  });

  it("renders empty capture states", () => {
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [
        {
          chemicalLogs: 0,
          forms: 0,
          jobId: "job-1",
          photos: 0,
          signatures: 0,
        },
        { ...fullSummary("job-needs"), signatures: 0 },
        fullSummary("job-invoiced"),
      ],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review: {
        ...review,
        form_submissions: [],
        chemical_logs: [],
        photos: [],
        signatures: [],
      },
    } as never);

    render(<CloseoutsClient />);

    expect(screen.getAllByText("Needs field captures").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(
        "Missing treatment form, chemical log, photo, and signature before billing.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Ask the technician to sync treatment form, chemical log, photo, and signature before billing or portal handoff.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No treatment forms captured for this job."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No chemical logs captured for this job."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No photos captured for this job."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No signatures captured for this job."),
    ).toBeInTheDocument();
  });

  it("uses warning tones for synced-proof gaps", () => {
    vi.mocked(useJobGeofenceEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<CloseoutsClient />);

    expect(screen.getByText("Arrival GPS missing")).toHaveClass(
      "text-status-alert-warning-fg",
    );
    expect(screen.getByText("Departure GPS missing")).toHaveClass(
      "text-status-alert-warning-fg",
    );
    expect(screen.getByText("Review synced field evidence")).toHaveClass(
      "text-status-alert-warning-fg",
    );
  });

  it("filters queue sections from counter tiles", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    expect(
      screen.getByRole("button", { name: /Proof ready 2/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /GPS review 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Needs invoice 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Billing ready 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Proof ready 2/i }),
    ).toHaveAttribute("aria-pressed", "false");

    await user.click(
      screen.getByRole("button", { name: /Missing captures 1/i }),
    );

    expect(
      screen.getByRole("button", { name: /Missing captures 1/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByLabelText("Queue section Needs captures"),
    ).toHaveAttribute("open");
    expect(screen.getByText("Missing: photo · signature")).toBeInTheDocument();
    expect(
      screen.getByText("Billing handoff is blocked until captures sync."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Interior treatment")).not.toBeInTheDocument();
  });

  it("shows the payment date for paid invoice next actions", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        {
          ...invoice,
          status: "paid",
          payments: [
            {
              id: "payment-1",
              invoice_id: "invoice-1",
              provider: "stripe",
              provider_payment_id: "pi_1",
              status: "succeeded",
              amount_cents: 12500,
              currency: "usd",
              paid_at: "2026-05-07T15:00:00Z",
              created_at: now,
              updated_at: now,
            },
          ],
        },
      ],
      isLoading: false,
    } as never);

    render(<CloseoutsClient />);

    await user.click(screen.getByText("30 Cedar Road"));

    expect(
      screen.getByText("$125.00 received May 7, 2026."),
    ).toBeInTheDocument();
  });
});

function fullSummary(jobId: string) {
  return {
    chemicalLogs: 1,
    forms: 1,
    jobId,
    photos: 1,
    signatures: 1,
  };
}
