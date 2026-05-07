import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useAssignJobTechnician,
  useChangeJobStatus,
  useJobs,
  useTechnicians,
} from "../../hooks/useJobs";
import { DispatchClient } from "./dispatch-client";

vi.mock("../../hooks/useCustomers", () => ({
  useCustomers: vi.fn(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useAssignJobTechnician: vi.fn(),
  useChangeJobStatus: vi.fn(),
  useJobs: vi.fn(),
  useTechnicians: vi.fn(),
}));

const now = "2026-05-05T00:00:00Z";
const technician = {
  id: "technician-1",
  role: "technician",
  email: "testnician@example.com",
  display_name: "Testnician",
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
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
  ],
} as const;
const scheduledJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: "2026-05-06T09:00:00",
  scheduled_end: null,
  status: "scheduled",
  service_notes: null,
  created_at: now,
  updated_at: now,
  customer,
  location: customer.locations[0],
} as const;
const completedJob = {
  ...scheduledJob,
  id: "job-2",
  status: "completed",
  assigned_tech_id: "technician-1",
  scheduled_start: "2026-05-07T10:00:00",
} as const;

describe("DispatchClient", () => {
  const changeStatusMutate = vi.fn();
  const assignTechnicianMutate = vi.fn();

  beforeEach(() => {
    vi.mocked(useCustomers).mockReturnValue({
      data: [customer],
      isLoading: false,
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [scheduledJob, completedJob],
      isLoading: false,
    } as never);
    vi.mocked(useTechnicians).mockReturnValue({
      data: [technician],
      isLoading: false,
    } as never);
    vi.mocked(useChangeJobStatus).mockReturnValue({
      mutate: changeStatusMutate,
      isPending: false,
    } as never);
    vi.mocked(useAssignJobTechnician).mockReturnValue({
      mutate: assignTechnicianMutate,
      isPending: false,
    } as never);
    changeStatusMutate.mockReset();
    assignTechnicianMutate.mockReset();
  });

  it("renders jobs grouped in the selected week", () => {
    render(<DispatchClient />);

    expect(screen.getAllByText("Apex Homes")).toHaveLength(2);
    expect(screen.getAllByText("10 Pine Street")).toHaveLength(2);
  });

  it("filters by status and technician", async () => {
    const user = userEvent.setup();
    render(<DispatchClient />);

    await user.selectOptions(screen.getByLabelText("Dispatch status"), "completed");
    await user.selectOptions(screen.getByLabelText("Dispatch technician"), "technician-1");

    expect(screen.getByLabelText("Status for job-2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status for job-1")).not.toBeInTheDocument();
  });

  it("labels technician filters by display name", () => {
    render(<DispatchClient />);

    expect(screen.getAllByRole("option", { name: "Testnician" }).length).toBeGreaterThan(0);
  });

  it("navigates weeks", async () => {
    const user = userEvent.setup();
    render(<DispatchClient />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.queryByLabelText("Status for job-1")).not.toBeInTheDocument();
  });

  it("quick-updates status and technician", async () => {
    const user = userEvent.setup();
    render(<DispatchClient />);

    await user.selectOptions(screen.getByLabelText("Status for job-1"), "en_route");
    await user.selectOptions(screen.getByLabelText("Technician for job-1"), "technician-1");

    expect(changeStatusMutate).toHaveBeenCalledWith({
      job: scheduledJob,
      status: "en_route",
    });
    expect(assignTechnicianMutate).toHaveBeenCalledWith({
      job: scheduledJob,
      technicianId: "technician-1",
    });
  });
});
