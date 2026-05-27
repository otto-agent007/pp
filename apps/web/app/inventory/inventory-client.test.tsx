import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useJobs } from "../../hooks/useJobs";
import {
  useArchiveChemicalInventory,
  useChemicalInventory,
  useChemicalLogs,
  useCreateChemicalInventory,
  useCreateChemicalLog,
  useUpdateChemicalInventory,
} from "../../hooks/useInventory";
import { InventoryClient } from "./inventory-client";

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/useInventory", () => ({
  useArchiveChemicalInventory: vi.fn(),
  useChemicalInventory: vi.fn(),
  useChemicalLogs: vi.fn(),
  useCreateChemicalInventory: vi.fn(),
  useCreateChemicalLog: vi.fn(),
  useUpdateChemicalInventory: vi.fn(),
}));

const now = "2026-05-05T00:00:00Z";
const activeChemical = {
  id: "chemical-1",
  name: "Bait Gel",
  epa_number: "EPA-123",
  current_stock: 2,
  unit: "oz",
  reorder_level: 4,
  status: "active",
  created_at: now,
  updated_at: now,
} as const;
const archivedChemical = {
  ...activeChemical,
  id: "chemical-2",
  name: "Old Spray",
  status: "archived",
} as const;
const noLogChemical = {
  ...activeChemical,
  current_stock: 8,
  id: "chemical-3",
  name: "Dust",
  reorder_level: 2,
} as const;
const job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: "2026-05-06T09:00:00Z",
  scheduled_end: null,
  status: "scheduled",
  service_notes: null,
  created_at: now,
  updated_at: now,
  customer: {
    id: "customer-1",
    name: "Apex Homes",
    phone: null,
    email: null,
    property_type: "residential",
    service_notes: null,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  location: {
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
} as const;
const chemicalLogs = [
  {
    id: "log-1",
    job_id: "job-1",
    chemical_id: "chemical-1",
    amount_used: 2.5,
    notes: null,
    created_at: "2026-05-07T12:00:00Z",
    chemical: activeChemical,
    job,
  },
  {
    id: "log-2",
    job_id: "job-1",
    chemical_id: "chemical-1",
    amount_used: 1,
    notes: null,
    created_at: "2026-05-06T12:00:00Z",
    chemical: activeChemical,
    job: {
      ...job,
      customer: {
        ...job.customer,
        name: "Rivera Cafe",
      },
    },
  },
  {
    id: "log-3",
    job_id: "job-1",
    chemical_id: "chemical-1",
    amount_used: 3,
    notes: null,
    created_at: "2026-05-05T12:00:00Z",
    chemical: activeChemical,
    job: {
      ...job,
      customer: {
        ...job.customer,
        name: "Nguyen Residence",
      },
    },
  },
  {
    id: "log-4",
    job_id: "job-1",
    chemical_id: "chemical-1",
    amount_used: 4,
    notes: null,
    created_at: "2026-05-04T12:00:00Z",
    chemical: activeChemical,
    job: {
      ...job,
      customer: {
        ...job.customer,
        name: "Park Apartments",
      },
    },
  },
] as const;

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

describe("InventoryClient", () => {
  const createInventoryMutateAsync = vi.fn();
  const updateInventoryMutateAsync = vi.fn();
  const archiveInventoryMutate = vi.fn();
  const createLogMutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useChemicalInventory).mockReturnValue({
      data: [activeChemical, archivedChemical],
      isLoading: false,
    } as never);
    vi.mocked(useChemicalLogs).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useJobs).mockReturnValue({
      data: [job],
      isLoading: false,
    } as never);
    vi.mocked(useCreateChemicalInventory).mockReturnValue({
      mutateAsync: createInventoryMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useUpdateChemicalInventory).mockReturnValue({
      mutateAsync: updateInventoryMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useArchiveChemicalInventory).mockReturnValue({
      mutate: archiveInventoryMutate,
      isPending: false,
    } as never);
    vi.mocked(useCreateChemicalLog).mockReturnValue({
      mutateAsync: createLogMutateAsync,
      isPending: false,
    } as never);
    createInventoryMutateAsync.mockReset();
    updateInventoryMutateAsync.mockReset();
    archiveInventoryMutate.mockReset();
    createLogMutateAsync.mockReset();
    createInventoryMutateAsync.mockResolvedValue(activeChemical);
    updateInventoryMutateAsync.mockResolvedValue(activeChemical);
    createLogMutateAsync.mockResolvedValue({});
  });

  it("renders summary and low stock state", () => {
    render(<InventoryClient />);

    expect(screen.getByLabelText("Name").closest("label")).toHaveClass(
      "text-theme-text-primary",
    );
    expect(screen.getAllByText("Low stock")).toHaveLength(2);
    expect(screen.getByText("Needs reorder review")).toHaveClass(
      "text-status-alert-danger-fg",
    );
    expect(
      screen.getByText("Needs reorder review").closest(".rounded-lg"),
    ).toHaveClass(
      "border-status-alert-danger-border",
      "bg-status-alert-danger-bg",
    );
    expect(screen.getAllByText("Bait Gel").length).toBeGreaterThan(0);
    expect(screen.getByText("Product cockpit")).toBeInTheDocument();
    expect(screen.getByText("Bait Gel selected")).toBeInTheDocument();
    expect(screen.getByText("Inspect aging stock")).toBeInTheDocument();
    expect(screen.getByText("2 oz | Reorder at 4 oz")).toBeInTheDocument();
    expect(
      screen.getByText("2 oz | Reorder at 4 oz").closest('[role="article"]'),
    ).toHaveClass(
      "border-status-alert-danger-border",
      "bg-status-alert-danger-bg",
    );
  });

  it("keeps clear low-stock counters neutral instead of success green", () => {
    vi.mocked(useChemicalInventory).mockReturnValue({
      data: [{ ...activeChemical, current_stock: 10 }],
      isLoading: false,
    } as never);

    render(<InventoryClient />);

    expect(screen.getByText("No reorder alerts")).toHaveClass(
      "text-theme-text-secondary",
    );
    expect(screen.getByText("No reorder alerts")).not.toHaveClass(
      "text-status-alert-success-fg",
    );
  });

  it("filters archived inventory", async () => {
    const user = userEvent.setup();
    render(<InventoryClient />);

    await user.selectOptions(
      screen.getByLabelText("Inventory status"),
      "archived",
    );

    expect(screen.getByText("Old Spray")).toBeInTheDocument();
    expect(screen.queryByText("Bait Gel")).not.toBeInTheDocument();
  });

  it("validates required chemical fields", async () => {
    const user = userEvent.setup();
    render(<InventoryClient />);

    await user.click(screen.getByRole("button", { name: "Save chemical" }));

    expect(screen.getByText("Chemical name is required")).toBeInTheDocument();
  });

  it("creates and edits chemical inventory", async () => {
    render(<InventoryClient />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Dust" },
    });
    fireEvent.change(screen.getByLabelText("EPA number"), {
      target: { value: "EPA-999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save chemical" }));

    await waitFor(() =>
      expect(createInventoryMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Dust", epa_number: "EPA-999" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save chemical" }));

    await waitFor(() =>
      expect(updateInventoryMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "chemical-1",
          input: expect.objectContaining({ name: "Bait Gel" }),
        }),
      ),
    );
  });

  it("archives active inventory", async () => {
    const user = userEvent.setup();
    render(<InventoryClient />);

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(archiveInventoryMutate).toHaveBeenCalledWith("chemical-1");
  });

  it("logs chemical usage", async () => {
    const user = userEvent.setup();
    render(<InventoryClient />);

    await chooseSearchableOption(user, "Job", "apex", /Apex Homes/);
    await chooseSearchableOption(user, "Chemical", "bait", /Bait Gel/);
    await user.clear(screen.getByLabelText("Amount used"));
    await user.type(screen.getByLabelText("Amount used"), "2");
    await user.click(screen.getByRole("button", { name: "Log chemical use" }));

    expect(createLogMutateAsync).toHaveBeenCalledWith({
      job_id: "job-1",
      chemical_id: "chemical-1",
      amount_used: 2,
      notes: null,
    });
  });

  it("shows job picker schedules as wall-clock job time", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [{ ...job, scheduled_start: "2026-05-06T09:38:00Z" }],
      isLoading: false,
    } as never);

    render(<InventoryClient />);

    await user.click(screen.getByRole("combobox", { name: "Job" }));

    expect(
      await screen.findByRole("option", {
        name: "5/6/26, 9:38 AM - Apex Homes - 10 Pine Street",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /2:38 AM/ }),
    ).not.toBeInTheDocument();
  });

  it("shows per-chemical usage counts and expands the last three uses", async () => {
    const user = userEvent.setup();
    vi.mocked(useChemicalInventory).mockReturnValue({
      data: [activeChemical, noLogChemical],
      isLoading: false,
    } as never);
    vi.mocked(useChemicalLogs).mockReturnValue({
      data: chemicalLogs,
      isLoading: false,
    } as never);

    render(<InventoryClient />);

    expect(screen.getByText("4 uses logged")).toBeInTheDocument();
    expect(screen.getByText("No uses logged yet")).toBeInTheDocument();
    expect(
      screen.getByText("Last used May 7, 2026 - Apex Homes"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "View uses for Bait Gel" }),
    );

    expect(screen.getByText("Recent uses")).toBeInTheDocument();
    expect(screen.getByText("Apex Homes")).toBeInTheDocument();
    expect(screen.getByText("Rivera Cafe")).toBeInTheDocument();
    expect(screen.getByText("Nguyen Residence")).toBeInTheDocument();
    expect(screen.queryByText("Park Apartments")).not.toBeInTheDocument();
    expect(screen.getByText("2.5 oz - May 7, 2026")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse uses for Bait Gel" }),
    ).toBeInTheDocument();
  });

  it("lets operators select an inventory product for cockpit review", async () => {
    const user = userEvent.setup();
    vi.mocked(useChemicalInventory).mockReturnValue({
      data: [activeChemical, noLogChemical],
      isLoading: false,
    } as never);
    vi.mocked(useChemicalLogs).mockReturnValue({
      data: chemicalLogs,
      isLoading: false,
    } as never);

    render(<InventoryClient />);

    expect(screen.getByText("Bait Gel selected")).toBeInTheDocument();
    expect(screen.getByText("Reorder now")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Inspect Dust" }));

    expect(screen.getByText("Dust selected")).toBeInTheDocument();
    expect(screen.getByText("Stocked for field use")).toBeInTheDocument();
  });
});
