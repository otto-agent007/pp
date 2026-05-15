import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./page";

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

vi.mock("../hooks/useCustomers", () => ({
  useCustomers: () => ({
    data: [{ status: "active" }, { status: "archived" }],
    isLoading: false,
  }),
}));

vi.mock("../hooks/useJobs", () => ({
  useJobs: () => ({
    data: [
      {
        customer: { name: "Demo - Harbor Heights HOA" },
        id: "job-1",
        scheduled_start: "2026-05-14T09:38:00.000Z",
        service_notes: "Rodent Control",
        status: "scheduled",
      },
      {
        customer: { name: "Demo - Rivera Cafe" },
        id: "job-2",
        scheduled_start: "2026-05-14T07:45:00.000Z",
        service_notes: "General Pest",
        status: "completed",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("../hooks/useTechnicians", () => ({
  useTechnicians: () => ({
    data: [{ status: "active" }, { status: "inactive" }],
    isLoading: false,
  }),
}));

vi.mock("../hooks/useInventory", () => ({
  useChemicalInventory: () => ({
    data: [
      {
        current_stock: 4,
        name: "Demo - Ant Bait Stations",
        reorder_level: 6,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("../hooks/usePayments", () => ({
  useInvoices: () => ({
    data: [{ status: "sent", total_cents: 28500 }],
    isLoading: false,
  }),
}));

vi.mock("../hooks/useCustomerPortalAccess", () => ({
  useCustomerPortalProviderStatus: () => ({
    data: {
      provider: "manual",
      webhook_configured: false,
      webhook_secret_configured: false,
    },
    isLoading: false,
  }),
}));

vi.mock("./demo-seed-controls", () => ({
  DemoSeedControls: () => <div>Demo data controls</div>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T16:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an Option 1-style field command center with live snapshot counts", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Field command center" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Live operations snapshot")).toBeInTheDocument();
    expect(screen.getByText("Today's jobs")).toBeInTheDocument();
    expect(screen.getByText("1 active today")).toBeInTheDocument();
    expect(screen.getByText("$285.00")).toBeInTheDocument();
    expect(screen.getByText("Manual portal sharing")).toBeInTheDocument();
    expect(screen.getByText(/Demo - Ant Bait Stations/)).toBeInTheDocument();
    expect(screen.getByText("Demo data controls")).toBeInTheDocument();
  });

  it("renders guided smoke links with sanitized evidence prompts", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Guided demo smoke" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create customer and location/ }),
    ).toHaveAttribute("href", "/customers");
    expect(
      screen.getByRole("link", { name: /Schedule a job/ }),
    ).toHaveAttribute("href", "/jobs");
    expect(
      screen.getAllByText(
        "Record the route, action taken, and visible success signal without adding provider secrets or production customer data.",
      ),
    ).toHaveLength(5);
    expect(screen.getByText(/Success: Customer appears active/i)).toBeInTheDocument();
    expect(screen.queryByText(/seed fake production data/i)).not.toBeInTheDocument();
  });
});
