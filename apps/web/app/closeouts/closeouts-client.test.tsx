import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCloseoutCaptureSummaries,
  useJobCloseoutReview,
} from "../../hooks/useCloseouts";
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import { useJobs } from "../../hooks/useJobs";
import { useInvoices } from "../../hooks/usePayments";
import { CloseoutsClient } from "./closeouts-client";

vi.mock("../../hooks/useCloseouts", () => ({
  useCloseoutCaptureSummaries: vi.fn(),
  useJobCloseoutReview: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/useGeofencing", () => ({
  useJobGeofenceEvents: vi.fn(),
}));

vi.mock("../../hooks/usePayments", () => ({
  useInvoices: vi.fn(),
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
  scheduled_start: "2026-05-06T09:00:00Z",
  scheduled_end: null,
  status: "completed",
  service_notes: "Interior treatment",
  created_at: now,
  updated_at: now,
  customer,
  location,
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
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review,
    } as never);
    vi.mocked(useJobGeofenceEvents).mockReturnValue({
      data: [arrivalEvent, departureEvent],
      isLoading: false,
    } as never);
  });

  it("renders closeout captures for the selected completed job", () => {
    render(<CloseoutsClient />);

    expect(screen.getByRole("heading", { name: "Billing work queue" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Completed jobs grouped by billing readiness. Open one to review captures or create an invoice.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ready to bill").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs captures").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Invoiced").length).toBeGreaterThan(0);
    expect(screen.getByText("Total completed")).toBeInTheDocument();
    expect(screen.getByText("Proof handoff readiness")).toBeInTheDocument();
    expect(screen.getByText("Ready for office proof review")).toBeInTheDocument();
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
    expect(
      screen.getByText("Needs photo and signature before billing."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sent")).toBeInTheDocument();
    expect(screen.getByText("Treatment Form")).toBeInTheDocument();
    expect(screen.getByText("Ants")).toBeInTheDocument();
    expect(screen.getByText("Bait Gel")).toBeInTheDocument();
    expect(screen.getByText("Kitchen photo")).toBeInTheDocument();
    expect(screen.getByText("Signed by Jamie")).toBeInTheDocument();
    expect(screen.getAllByText("Ready to bill").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Treatment form, chemical log, photo, and signature are captured."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute(
      "href",
      "/payments?job_id=job-1",
    );
    expect(screen.getByRole("link", { name: "Open customer ledger" })).toHaveAttribute(
      "href",
      "/customers?customer_id=customer-1",
    );
  });

  it("points invoiced closeouts toward portal sharing", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    await user.click(screen.getByText("30 Cedar Road"));

    expect(screen.getByRole("link", { name: "Share portal" })).toHaveAttribute(
      "href",
      "/customers?customer_id=customer-1",
    );
  });

  it("filters to completed jobs by default and can show all jobs", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    expect(screen.queryByText("Upcoming service")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Queue status"), "all");

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

    expect(screen.getAllByText("Needs field captures").length).toBeGreaterThan(0);
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
    expect(screen.getByText("No chemical logs captured for this job.")).toBeInTheDocument();
    expect(screen.getByText("No photos captured for this job.")).toBeInTheDocument();
    expect(screen.getByText("No signatures captured for this job.")).toBeInTheDocument();
  });

  it("filters queue sections from counter tiles", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    await user.click(screen.getByRole("button", { name: /Needs captures 1/i }));

    expect(screen.getByText("Needs photo and signature")).toBeInTheDocument();
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

    expect(screen.getByText("$125.00 received May 7, 2026.")).toBeInTheDocument();
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
