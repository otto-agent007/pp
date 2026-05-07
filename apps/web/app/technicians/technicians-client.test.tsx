import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useInviteTechnician,
  useTechnicianDirectory,
} from "../../hooks/useTechnicians";
import { TechniciansClient } from "./technicians-client";

vi.mock("../../hooks/useTechnicians", () => ({
  useInviteTechnician: vi.fn(),
  useTechnicianDirectory: vi.fn(),
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

describe("TechniciansClient", () => {
  const inviteMutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useTechnicianDirectory).mockReturnValue({
      data: [technician],
      isLoading: false,
    } as never);
    vi.mocked(useInviteTechnician).mockReturnValue({
      mutateAsync: inviteMutateAsync,
      isPending: false,
    } as never);
    inviteMutateAsync.mockReset();
    inviteMutateAsync.mockResolvedValue({ technician });
  });

  it("renders technician profiles and filters them", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    expect(screen.getByText("Testnician")).toBeInTheDocument();
    expect(screen.getByText("testnician@example.com")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search technicians"), "missing");

    expect(screen.getByText("No technicians found")).toBeInTheDocument();
  });

  it("validates and invites technicians to set their own password", async () => {
    const user = userEvent.setup();
    render(<TechniciansClient />);

    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(screen.getByText("Technician email is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Display name"), "Testnician");
    await user.type(
      screen.getByLabelText("Email"),
      "TESTNICIAN@EXAMPLE.COM",
    );
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    expect(inviteMutateAsync).toHaveBeenCalledWith({
      email: "testnician@example.com",
      display_name: "Testnician",
    });
    expect(
      await screen.findByText("Testnician was invited to set a password."),
    ).toBeInTheDocument();
  });
});
