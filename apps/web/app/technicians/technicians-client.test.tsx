import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useArchiveTechnicianLicense,
  useCreateTechnicianLicense,
  useInviteTechnician,
  useTechnicianDirectory,
  useTechnicianLicenses,
  useUpdateTechnicianLicense,
} from "../../hooks/useTechnicians";
import { useJobs } from "../../hooks/useJobs";
import { TechniciansClient } from "./technicians-client";

vi.mock("../../hooks/useTechnicians", () => ({
  useArchiveTechnicianLicense: vi.fn(),
  useCreateTechnicianLicense: vi.fn(),
  useInviteTechnician: vi.fn(),
  useTechnicianDirectory: vi.fn(),
  useTechnicianLicenses: vi.fn(),
  useUpdateTechnicianLicense: vi.fn(),
}));
vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

const now = "2026-05-07T00:00:00.000Z";
const technician = {
  id: "technician-1",
  role: "technician",
  email: "testnician@example.com",
  display_name: "Testnician",
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const technicianLicense = {
  id: "license-1",
  technician_id: "technician-1",
  license_type: "operator",
  branch: "branch_3",
  license_number: "OPR-123",
  issuing_authority: "spcb",
  status: "active",
  expires_at: "2026-12-31",
  notes: null,
  archived_at: null,
  created_at: now,
  updated_at: now,
} as const;

const demoTechnicians = Array.from({ length: 16 }, (_, index) => ({
  ...technician,
  id: `technician-${index + 1}`,
  display_name: `Demo Tech ${index + 1}`,
  email: `demo+tech-${index + 1}@example.test`,
}));

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);

  return copy;
}

function localDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

describe("TechniciansClient", () => {
  const inviteMutateAsync = vi.fn();
  const createLicenseMutateAsync = vi.fn();
  const updateLicenseMutateAsync = vi.fn();
  const archiveLicenseMutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useTechnicianDirectory).mockReturnValue({
      data: [technician],
      isLoading: false,
    } as never);
    vi.mocked(useInviteTechnician).mockReturnValue({
      mutateAsync: inviteMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useTechnicianLicenses).mockReturnValue({
      data: [technicianLicense],
      isLoading: false,
      schemaUnavailable: false,
      setupWarning: null,
    } as never);
    vi.mocked(useCreateTechnicianLicense).mockReturnValue({
      mutateAsync: createLicenseMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useUpdateTechnicianLicense).mockReturnValue({
      mutateAsync: updateLicenseMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useArchiveTechnicianLicense).mockReturnValue({
      mutateAsync: archiveLicenseMutateAsync,
      isPending: false,
    } as never);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    vi.mocked(useJobs).mockReturnValue({
      data: [
        {
          id: "job-1",
          customer_id: "customer-1",
          location_id: "location-1",
          assigned_tech_id: "technician-1",
          status: "en_route",
          scheduled_start: `${localDateKey(today)}T09:00:00`,
          scheduled_end: null,
          service_notes: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: "job-2",
          customer_id: "customer-2",
          location_id: "location-2",
          assigned_tech_id: "technician-1",
          status: "scheduled",
          scheduled_start: `${localDateKey(tomorrow)}T09:00:00`,
          scheduled_end: null,
          service_notes: null,
          created_at: now,
          updated_at: now,
        },
      ],
      isLoading: false,
    } as never);
    inviteMutateAsync.mockReset();
    createLicenseMutateAsync.mockReset();
    updateLicenseMutateAsync.mockReset();
    archiveLicenseMutateAsync.mockReset();
    inviteMutateAsync.mockResolvedValue({ technician });
    createLicenseMutateAsync.mockResolvedValue(technicianLicense);
    updateLicenseMutateAsync.mockResolvedValue(technicianLicense);
    archiveLicenseMutateAsync.mockResolvedValue(technicianLicense);
  });

  it("renders technician profiles and filters them", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    expect(screen.getByText("Technician roster")).toBeInTheDocument();
    expect(screen.getByText("Dispatch-ready crew")).toBeInTheDocument();
    const activeTechsTile = screen
      .getByText("Active techs")
      .closest(".rounded-lg");
    expect(activeTechsTile).toBeInTheDocument();
    expect(
      within(activeTechsTile as HTMLElement).getByText("1"),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Testnician" })).toBeInTheDocument();
    expect(screen.getAllByText("Testnician").length).toBeGreaterThan(0);
    expect(screen.getByText("testnician@example.com")).toBeInTheDocument();
    expect(screen.getByText("1 today")).toBeInTheDocument();
    expect(screen.getByText("1 today").closest(".rounded-md")).toHaveClass(
      "bg-status-alert-warning-bg",
      "border-status-alert-warning-border",
    );
    expect(screen.getByText("1 upcoming")).toBeInTheDocument();
    expect(screen.getByText("En route")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open in dispatch" }),
    ).toHaveAttribute("href", "/dispatch?technician=technician-1");

    await user.type(screen.getByLabelText("Search technicians"), "missing");

    expect(screen.getByText("No technicians found")).toBeInTheDocument();
  });

  it("surfaces sixteen active demo technicians at the top of the page", () => {
    vi.mocked(useTechnicianDirectory).mockReturnValue({
      data: demoTechnicians,
      isLoading: false,
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<TechniciansClient />);

    const activeTechsTile = screen
      .getByText("Active techs")
      .closest(".rounded-lg");
    expect(activeTechsTile).toBeInTheDocument();
    expect(
      within(activeTechsTile as HTMLElement).getByText("16"),
    ).toBeInTheDocument();
  });

  it("shows technician access handoff guidance before inviting", () => {
    render(<TechniciansClient />);

    expect(screen.getByText("Technician access handoff")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Sends a password setup link through the configured email delivery path.",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByText(
        "Confirm the email, send the invite, then open dispatch to assign the first route.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open dispatch after invite" }),
    ).toHaveAttribute("href", "/dispatch");
  });

  it("renders technician credentials and creates an admin-editable license", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    expect(screen.getAllByText("Credential tracking").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("OPR-123")).toBeInTheDocument();
    expect(screen.getByText("Branch 3")).toBeInTheDocument();
    expect(screen.getAllByText("Testnician").length).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByLabelText("Credential technician"),
      "technician-1",
    );
    await user.selectOptions(screen.getByLabelText("License type"), "operator");
    await user.selectOptions(
      screen.getByLabelText("Credential branch"),
      "branch_3",
    );
    await user.clear(screen.getByLabelText("License number"));
    await user.type(screen.getByLabelText("License number"), "OPR-456");
    await user.clear(screen.getByLabelText("Expiration date"));
    await user.type(screen.getByLabelText("Expiration date"), "2027-01-15");
    await user.click(screen.getByRole("button", { name: "Save credential" }));

    expect(createLicenseMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "branch_3",
        license_number: "OPR-456",
        technician_id: "technician-1",
      }),
    );
  }, 10_000);

  it("updates and archives existing technician credentials", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    await user.click(
      screen.getByRole("button", { name: /Edit credential OPR-123/ }),
    );
    await user.clear(screen.getByLabelText("License number"));
    await user.type(screen.getByLabelText("License number"), "OPR-789");
    await user.click(screen.getByRole("button", { name: "Update credential" }));

    expect(updateLicenseMutateAsync).toHaveBeenCalledWith({
      id: "license-1",
      input: expect.objectContaining({
        license_number: "OPR-789",
      }),
    });

    await user.click(
      screen.getByRole("button", { name: /Archive credential/ }),
    );
    expect(archiveLicenseMutateAsync).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: /Confirm archive/ }),
    );

    expect(archiveLicenseMutateAsync).toHaveBeenCalledWith("license-1");
  }, 10_000);

  it("keeps the selected credential technician stable through search changes", async () => {
    const user = userEvent.setup();
    vi.mocked(useTechnicianDirectory).mockReturnValue({
      data: demoTechnicians,
      isLoading: false,
    } as never);
    vi.mocked(useTechnicianLicenses).mockReturnValue({
      data: [],
      isLoading: false,
      schemaUnavailable: false,
      setupWarning: null,
    } as never);
    render(<TechniciansClient />);

    const technicianSelect = screen.getByLabelText(
      "Credential technician",
    ) as HTMLSelectElement;

    await user.selectOptions(technicianSelect, "technician-2");
    expect(technicianSelect).toHaveValue("technician-2");

    fireEvent.change(screen.getByLabelText("Search technicians"), {
      target: { value: "Demo Tech 1" },
    });
    expect(technicianSelect).toHaveValue("technician-2");

    fireEvent.change(screen.getByLabelText("Search technicians"), {
      target: { value: "" },
    });
    expect(technicianSelect).toHaveValue("technician-2");
  });

  it("validates and invites technicians to set their own password", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(
      screen.getByText("Technician email is required"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Display name"), "Testnician");
    await user.type(screen.getByLabelText("Email"), "TESTNICIAN@EXAMPLE.COM");
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(inviteMutateAsync).toHaveBeenCalledWith({
      email: "testnician@example.com",
      display_name: "Testnician",
    });
    expect(
      await screen.findByText("Testnician was invited to set a password."),
    ).toBeInTheDocument();
  }, 10_000);
});
