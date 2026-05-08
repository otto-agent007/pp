import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useJobCloseoutReview } from "../../hooks/useCloseouts";
import { useJobs } from "../../hooks/useJobs";
import { CloseoutsClient } from "./closeouts-client";

vi.mock("../../hooks/useCloseouts", () => ({
  useJobCloseoutReview: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
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
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useJobCloseoutReview).mockReturnValue({
      error: null,
      isLoading: false,
      review,
    } as never);
  });

  it("renders closeout captures for the selected completed job", () => {
    render(<CloseoutsClient />);

    expect(screen.getByRole("heading", { name: "Job closeouts" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Completed jobs from dispatch appear here so office staff can review field captures before billing or customer follow-up.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Field captures include forms, chemical logs, photos, and signatures submitted by the technician.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Treatment Form")).toBeInTheDocument();
    expect(screen.getByText("Ants")).toBeInTheDocument();
    expect(screen.getByText("Bait Gel")).toBeInTheDocument();
    expect(screen.getByText("Kitchen photo")).toBeInTheDocument();
    expect(screen.getByText("Signed by Jamie")).toBeInTheDocument();
  });

  it("filters to completed jobs by default and can show all jobs", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    expect(screen.queryByText("Upcoming service")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Closeout status"), "all");

    expect(screen.getByText("Upcoming service")).toBeInTheDocument();
  });

  it("renders an empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<CloseoutsClient />);

    await user.type(screen.getByLabelText("Search closeouts"), "missing");

    expect(screen.getByText("No closeouts found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Clear the search, show all jobs, or complete a dispatched job to start a closeout review.",
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

    expect(screen.getByText("No closeouts found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Complete a job in dispatch to move it into closeout review with its field captures.",
      ),
    ).toBeInTheDocument();
  });

  it("renders empty capture states", () => {
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

    expect(
      screen.getByText("No treatment forms captured for this job."),
    ).toBeInTheDocument();
    expect(screen.getByText("No chemical logs captured for this job.")).toBeInTheDocument();
    expect(screen.getByText("No photos captured for this job.")).toBeInTheDocument();
    expect(screen.getByText("No signatures captured for this job.")).toBeInTheDocument();
  });
});
