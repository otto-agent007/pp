import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useCancelJob,
  useCreateJob,
  useJobs,
  useTechnicians,
  useUpdateJob,
} from "../../hooks/useJobs";
import { JobsClient } from "./jobs-client";

vi.mock("../../hooks/useCustomers", () => ({
  useCustomers: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useCancelJob: vi.fn(),
  useCreateJob: vi.fn(),
  useJobs: vi.fn(),
  useTechnicians: vi.fn(),
  useUpdateJob: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const now = "2026-05-05T00:00:00Z";
const activeCustomer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: "555-1111",
  email: null,
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: now,
  updated_at: now,
  locations: [
    {
      id: "location-1",
      customer_id: "customer-1",
      address: "10 Pine Street",
      nickname: null,
      service_notes: null,
      is_primary: true,
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      id: "location-2",
      customer_id: "customer-1",
      address: "20 Oak Avenue",
      nickname: "Shop",
      service_notes: null,
      is_primary: false,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ],
} as const;

const scheduledJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: "2026-05-06T09:00:00Z",
  scheduled_end: null,
  status: "scheduled",
  service_notes: "Interior treatment",
  created_at: now,
  updated_at: now,
  customer: activeCustomer,
  location: activeCustomer.locations[0],
} as const;

const canceledJob = {
  ...scheduledJob,
  id: "job-2",
  status: "canceled",
  service_notes: "Canceled service",
} as const;

async function chooseSearchableOption(
  user: ReturnType<typeof userEvent.setup>,
  name: string | RegExp,
  search: string,
  optionName: string | RegExp,
) {
  const input = screen.getByRole("combobox", { name });

  await user.click(input);
  await user.clear(input);
  await user.type(input, search);
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("JobsClient", () => {
  const cancelMutate = vi.fn();
  const createMutateAsync = vi.fn();
  const updateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useCustomers).mockReturnValue({
      data: [activeCustomer],
      isLoading: false,
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [scheduledJob, canceledJob],
      isLoading: false,
    } as never);
    vi.mocked(useTechnicians).mockReturnValue({
      data: [
        {
          id: "technician-1",
          role: "technician",
          email: "testnician@example.com",
          display_name: "Testnician",
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ],
      isLoading: false,
    } as never);
    vi.mocked(useCancelJob).mockReturnValue({
      mutate: cancelMutate,
      isPending: false,
    } as never);
    vi.mocked(useCreateJob).mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useUpdateJob).mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as never);
    cancelMutate.mockReset();
    createMutateAsync.mockReset();
    updateMutateAsync.mockReset();
    createMutateAsync.mockResolvedValue(scheduledJob);
    updateMutateAsync.mockResolvedValue(scheduledJob);
  });

  it("renders an empty state when search has no matches", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await user.type(screen.getByLabelText("Search jobs"), "missing");

    expect(screen.getByText("No jobs found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create first job" }),
    ).toHaveAttribute("href", "#job-form");
  });

  it("shows demo scheduling helpers without creating records", () => {
    render(<JobsClient />);

    expect(screen.getByText("Job queue")).toBeInTheDocument();
    expect(screen.getByText("Ready for dispatch")).toBeInTheDocument();
    expect(screen.getByText("Scheduled jobs")).toBeInTheDocument();
    const helper = screen.getByText("Job setup notes").closest("details");
    expect(helper).not.toHaveAttribute("open");
    expect(
      screen.getByText(
        "Select a customer first so the location list only shows that customer active service addresses.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Technician assignment is optional; unassigned jobs can still move to dispatch review.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add customer" })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(
      screen.getByRole("link", { name: "Review dispatch" }),
    ).toHaveAttribute("href", "/dispatch");
  });

  it("labels technician options by display name", () => {
    render(<JobsClient />);

    const technician = screen.getByRole("combobox", { name: "Technician" });
    expect(technician).toHaveValue("Unassigned");
  });

  it("filters by status and date", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await user.selectOptions(screen.getByLabelText("Job status"), "canceled");
    await user.type(screen.getByLabelText("Date from"), "2026-05-06");

    expect(screen.getByText("Canceled service")).toBeInTheDocument();
    expect(screen.queryByText("Interior treatment")).not.toBeInTheDocument();
  });

  it("renders Z-suffixed scheduled timestamps as wall-clock job time", () => {
    render(<JobsClient />);

    expect(screen.getAllByText(/May 6, 2026, 9:00 AM/).length).toBeGreaterThan(
      0,
    );
  });

  it("validates required create fields", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await user.click(screen.getByRole("button", { name: "Save job" }));

    expect(screen.getByText("Scheduled start is required")).toBeInTheDocument();
  });

  it("updates locations when customer changes and creates a job", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await chooseSearchableOption(user, "Customer", "apex", "Apex Homes");
    expect(screen.getByRole("combobox", { name: "Location" })).toHaveValue(
      "10 Pine Street",
    );

    await chooseSearchableOption(user, "Location", "oak", /20 Oak Avenue/);
    await chooseSearchableOption(user, "Technician", "test", "Testnician");
    await user.type(screen.getByLabelText("Start"), "2026-05-06T09:00");
    await user.type(screen.getByLabelText("Service notes"), "Exterior");
    await user.click(screen.getByRole("button", { name: "Save job" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "customer-1",
        location_id: "location-2",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T09:00",
        service_notes: "Exterior",
      }),
    );
    expect(
      await screen.findByText(
        "Job created. Review dispatch to confirm assignment and route handoff.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open dispatch review" }),
    ).toHaveAttribute("href", "/dispatch");
  });

  it("edits an existing job", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.selectOptions(screen.getByLabelText("Status"), "en_route");
    await user.click(screen.getByRole("button", { name: "Save job" }));

    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        input: expect.objectContaining({ status: "en_route" }),
      }),
    );
    expect(
      await screen.findByText(
        "Job updated. Review dispatch to confirm assignment and route handoff.",
      ),
    ).toBeInTheDocument();
  });

  it("cancels a scheduled job", async () => {
    const user = userEvent.setup();
    render(<JobsClient />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(cancelMutate).toHaveBeenCalledWith("job-1");
  });
});
