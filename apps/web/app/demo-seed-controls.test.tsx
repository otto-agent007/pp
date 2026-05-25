import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDemoSeedStatus, useRunDemoSeedAction } from "../hooks/useDemoSeed";
import { DemoSeedControls } from "./demo-seed-controls";

vi.mock("../hooks/useDemoSeed", () => ({
  useDemoSeedStatus: vi.fn(),
  useRunDemoSeedAction: vi.fn(),
}));

const status = {
  status: {
    available: true,
    environment_label: "Local demo",
    reason: null,
    target: "local",
  },
  summary: {
    chemical_logs: 6,
    admin_users: 1,
    customers: 18,
    form_submissions: 4,
    inventory_items: 6,
    invoices: 3,
    jobs: 30,
    locations: 26,
    media_items: 3,
    payments: 1,
    technicians: 12,
  },
};

describe("DemoSeedControls", () => {
  const mutate = vi.fn();

  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useDemoSeedStatus).mockReturnValue({
      data: status,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useRunDemoSeedAction).mockReturnValue({
      data: null,
      error: null,
      isPending: false,
      mutate,
    } as never);
  });

  it("shows a friendly dry-run summary and demo actions", () => {
    render(<DemoSeedControls />);

    expect(
      screen.getByRole("heading", { name: "Demo data" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Local demo")).toBeInTheDocument();
    expect(screen.getByText("18 customers")).toBeInTheDocument();
    expect(screen.getByText("30 jobs")).toBeInTheDocument();
    expect(screen.getByText("12 technicians")).toBeInTheDocument();
    expect(screen.getByText(/3 media items/)).toBeInTheDocument();
    expect(
      screen.getByText("Demo login: demo@email.com / password"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Seed demo story" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Reset demo data" }),
    ).toBeEnabled();
  });

  it("sends confirmed seed and reset actions for the active target", () => {
    render(<DemoSeedControls />);

    fireEvent.click(screen.getByRole("button", { name: "Seed demo story" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset demo data" }));

    expect(mutate).toHaveBeenNthCalledWith(1, {
      action: "seed",
      confirm: "seed-demo-data",
      target: "local",
    });
    expect(mutate).toHaveBeenNthCalledWith(2, {
      action: "reset",
      confirm: "seed-demo-data",
      target: "local",
    });
  });

  it("disables writes and explains why when runtime is unavailable", () => {
    vi.mocked(useDemoSeedStatus).mockReturnValue({
      data: {
        ...status,
        status: {
          available: false,
          environment_label: "Production",
          reason: "Demo seed is disabled on production deployments.",
          target: "preview",
        },
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    } as never);

    render(<DemoSeedControls />);

    expect(
      screen.getByText("Demo seed is disabled on production deployments."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Seed demo story" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset demo data" }),
    ).toBeDisabled();
  });
});
