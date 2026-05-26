import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
        assigned_tech_id: "tech-1",
        customer: { name: "Demo - Harbor Heights HOA" },
        id: "job-1",
        location: {
          address: "100 Harbor Drive",
          latitude: 32.7157,
          longitude: -117.1611,
        },
        scheduled_start: "2026-05-14T09:38:00.000Z",
        service_notes: "Rodent Control",
        status: "scheduled",
      },
      {
        assigned_tech_id: "tech-2",
        customer: { name: "Demo - Rivera Cafe" },
        id: "job-2",
        location: {
          address: "458 Oak Ave",
          latitude: 32.6401,
          longitude: -117.0842,
        },
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
    data: [
      { display_name: "Maya Chen", id: "tech-1", status: "active" },
      { display_name: "Eli Brooks", id: "tech-2", status: "inactive" },
    ],
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

vi.mock("../hooks/useGeofencing", () => ({
  useJobGeofenceEvents: () => ({
    data: [
      {
        id: "gps-1",
        job_id: "job-1",
        event_type: "departure",
        latitude: 32.7422,
        longitude: -117.1772,
        accuracy_m: 18,
        distance_m: null,
        within_radius: null,
        recorded_by: "tech-1",
        client_event_id: "gps-client-1",
        captured_at: "2026-05-14T16:00:00.000Z",
        created_at: "2026-05-14T16:00:00.000Z",
      },
      {
        id: "gps-2",
        job_id: "job-2",
        event_type: "departure",
        latitude: 32.7157,
        longitude: -117.1611,
        accuracy_m: 16,
        distance_m: null,
        within_radius: null,
        recorded_by: "tech-2",
        client_event_id: "gps-client-2",
        captured_at: "2026-05-14T16:00:00.000Z",
        created_at: "2026-05-14T16:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("./admin-auth-context", () => ({
  useAdminAuth: () => ({
    profile: {
      id: "admin-1",
      role: "admin",
      display_name: "Carlos Mendoza",
      created_at: "2026-05-06T00:00:00.000Z",
      updated_at: "2026-05-06T00:00:00.000Z",
    },
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

  it("renders a UI Kit admin dashboard overview with compact operations panels", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Dashboard overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Good .* Carlos/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search customers, jobs, addresses/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Search by voice" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Today's jobs")).toBeInTheDocument();
    expect(screen.getByText("Today's jobs").closest(".rounded-lg")).toHaveClass(
      "bg-status-alert-success-bg",
      "border-status-alert-success-border",
    );
    expect(screen.getByText("1 active today")).toBeInTheDocument();
    expect(screen.getByText("$285.00")).toBeInTheDocument();
    expect(screen.getByText("$285.00").closest(".rounded-lg")).toHaveClass(
      "bg-status-alert-danger-bg",
      "border-status-alert-danger-border",
    );
    expect(
      screen.getByRole("heading", { name: "Today's schedule" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Live map" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Live map")).toHaveLength(1);
    expect(screen.getByText("Today's route")).toBeInTheDocument();
    expect(screen.getByText("2 techs live")).toBeInTheDocument();
    expect(screen.getByText("San Diego Bay")).toBeInTheDocument();
    expect(screen.getByText("Point Loma")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Eli Brooks GPS marker Stop 1: Demo - Rivera Cafe/,
      }),
    ).toHaveClass("bg-status-alert-success-solid");
    expect(
      screen.getByRole("link", {
        name: /Maya Chen GPS marker Stop 2: Demo - Harbor Heights HOA/,
      }),
    ).toHaveClass("bg-status-alert-info-solid");
    expect(screen.getByText("Scheduled").closest("span")).toHaveClass(
      "bg-status-alert-info-bg",
    );
    expect(
      screen.getByRole("heading", { name: "Jobs needing attention" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Low inventory" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Demo - Ant Bait Stations/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: "Recent activity" }),
    ).toBeInTheDocument();
    const toolsPanel = screen
      .getByText("Launch readiness tools")
      .closest("details");
    expect(toolsPanel).not.toHaveAttribute("open");
    expect(
      within(toolsPanel as HTMLElement).getByText("Demo data controls"),
    ).toBeInTheDocument();
  });

  it("filters loaded overview items from the dashboard search", () => {
    render(<HomePage />);

    fireEvent.change(
      screen.getByPlaceholderText(/Search customers, jobs, addresses/i),
      {
        target: { value: "Rivera" },
      },
    );

    expect(
      screen.getByRole("heading", { name: "Search results" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Demo - Rivera Cafe/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No dashboard matches/)).not.toBeInTheDocument();
  });

  it("renders guided smoke links with sanitized evidence prompts", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByText("Launch readiness tools"));

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
    expect(
      screen.getByText(/Success: Customer appears active/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/seed fake production data/i),
    ).not.toBeInTheDocument();
  });

  it("renders provider-free launch gate guidance without secret values", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByText("Launch readiness tools"));

    expect(
      screen.getByRole("heading", { name: "Smoke readiness" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Local smoke preflight")).toBeInTheDocument();
    expect(screen.getByText("Protected preview smoke")).toBeInTheDocument();
    expect(screen.getByText("Compliance source setup")).toBeInTheDocument();
    expect(screen.getByText("Manual fallback accepted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Portal links can be copied and shared manually without changing provider settings.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "corepack pnpm compliance:ingest -- --dry-run --no-embed",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/service-role key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/webhook secret/i)).not.toBeInTheDocument();
  });
});
