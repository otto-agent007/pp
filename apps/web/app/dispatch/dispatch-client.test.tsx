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
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
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

vi.mock("../../hooks/useGeofencing", () => ({
  useJobGeofenceEvents: vi.fn(),
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
      latitude: 33.8121,
      longitude: -117.919,
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
const arrivalEvent = {
  id: "event-arrival",
  job_id: "job-1",
  event_type: "arrival",
  latitude: 33.8121,
  longitude: -117.919,
  accuracy_m: 12,
  distance_m: 80,
  within_radius: true,
  recorded_by: "technician-1",
  client_event_id: "00000000-0000-4000-8000-000000000201",
  captured_at: "2026-05-06T09:05:00.000Z",
  created_at: "2026-05-06T09:05:00.000Z",
} as const;
const departureEvent = {
  ...arrivalEvent,
  id: "event-departure",
  event_type: "departure",
  distance_m: 210,
  within_radius: false,
  client_event_id: "00000000-0000-4000-8000-000000000202",
  captured_at: "2026-05-06T09:48:00.000Z",
  created_at: "2026-05-06T09:48:00.000Z",
} as const;
const completedJob = {
  ...scheduledJob,
  id: "job-2",
  status: "completed",
  assigned_tech_id: "technician-1",
  scheduled_start: "2026-05-07T10:00:00",
} as const;
const missingCoordinateJob = {
  ...scheduledJob,
  id: "job-missing-coordinates",
  assigned_tech_id: "technician-1",
  scheduled_start: "2026-05-06T11:00:00",
  location: {
    ...customer.locations[0],
    id: "location-missing-coordinates",
    address: "20 Oak Avenue",
    latitude: null,
    longitude: null,
  },
} as const;

describe("DispatchClient", () => {
  const changeStatusMutate = vi.fn();
  const assignTechnicianMutate = vi.fn();

  beforeEach(() => {
    vi.setSystemTime(new Date(now));
    window.history.replaceState({}, "", "/dispatch");
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
    vi.mocked(useJobGeofenceEvents).mockReturnValue({
      data: [arrivalEvent, departureEvent],
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

  it("renders Z-suffixed scheduled timestamps as wall-clock dispatch time", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [{ ...scheduledJob, scheduled_start: "2026-05-06T09:38:00Z" }],
      isLoading: false,
    } as never);

    render(<DispatchClient />);

    expect(screen.getByText("9:38 AM")).toBeInTheDocument();
  });

  it("explains scheduled job visibility and completed handoff", () => {
    render(<DispatchClient />);

    expect(
      screen.getByText(
        "Scheduled jobs stay visible for the week so the demo can show routing, assignment, and status changes.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Completed jobs stay on dispatch for the handoff, then appear in closeouts for field-capture review.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Technician mobile routes use the same assigned jobs, status priority, and scheduled order shown here.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /no map routing, optimization, or external navigation setup is required/,
      ),
    ).toBeInTheDocument();
  });

  it("renders provider-free route intelligence and stop readiness", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [scheduledJob, missingCoordinateJob, completedJob],
      isLoading: false,
    } as never);

    render(<DispatchClient />);

    expect(screen.getByText("Provider-free scheduled order")).toBeInTheDocument();
    expect(screen.getByText("3 stops")).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
    expect(screen.getByText("1 completed")).toBeInTheDocument();
    expect(screen.getByText("1 missing coordinates")).toBeInTheDocument();
    expect(screen.getByText("Stop 1")).toBeInTheDocument();
    expect(screen.getByText("Stop 2")).toBeInTheDocument();
    expect(screen.getAllByText("Service coordinates ready").length).toBeGreaterThan(0);
    expect(screen.getByText("Missing service coordinates")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open service map for job-1" }))
      .toHaveAttribute(
        "href",
        "https://www.google.com/maps/search/?api=1&query=33.8121%2C-117.919",
      );
  });

  it("updates route intelligence when technician filter changes", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [
        { ...scheduledJob, assigned_tech_id: "technician-1" },
        { ...missingCoordinateJob, assigned_tech_id: null },
      ],
      isLoading: false,
    } as never);

    render(<DispatchClient />);

    expect(screen.getByText("2 stops")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Dispatch technician"), "technician-1");

    expect(screen.getByText("1 stop")).toBeInTheDocument();
  });

  it("guides users when no jobs are scheduled for a day", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<DispatchClient />);

    expect(screen.getAllByText("No jobs scheduled").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Create or schedule jobs, then use dispatch to assign a technician and move work through completion.",
      ).length,
    ).toBeGreaterThan(0);
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

  it("preselects a matching technician from the query string", () => {
    window.history.replaceState({}, "", "/dispatch?technician=technician-1");

    render(<DispatchClient />);

    expect(screen.getByLabelText("Dispatch technician")).toHaveValue("technician-1");
    expect(screen.getByLabelText("Status for job-2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status for job-1")).not.toBeInTheDocument();
  });

  it("keeps all technicians selected when the query string omits technician", () => {
    render(<DispatchClient />);

    expect(screen.getByLabelText("Dispatch technician")).toHaveValue("all");
    expect(screen.getByLabelText("Status for job-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for job-2")).toBeInTheDocument();
  });

  it("ignores unknown technician query string values", () => {
    window.history.replaceState({}, "", "/dispatch?technician=technician-missing");

    render(<DispatchClient />);

    expect(screen.getByLabelText("Dispatch technician")).toHaveValue("all");
    expect(screen.getByLabelText("Status for job-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for job-2")).toBeInTheDocument();
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

  it("renders synced GPS evidence and provider-free map links", () => {
    render(<DispatchClient />);

    const evidence = screen.getByLabelText("GPS evidence for job-1");

    expect(evidence).toHaveTextContent("Latest GPS: Departure");
    expect(evidence).toHaveTextContent("Arrival");
    expect(evidence).toHaveTextContent("Within service radius (80 m)");
    expect(evidence).toHaveTextContent("Departure");
    expect(evidence).toHaveTextContent("Outside service radius (210 m)");
    expect(evidence).toHaveTextContent("Accuracy 12 m");
    expect(
      screen.getByRole("link", { name: "Open arrival map" }),
    ).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=33.8121%2C-117.919",
    );
  });

  it("renders missing GPS evidence copy when no synced event exists", () => {
    vi.mocked(useJobGeofenceEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<DispatchClient />);

    expect(
      screen.getAllByText("No synced GPS evidence yet").length,
    ).toBeGreaterThan(0);
  });
});
