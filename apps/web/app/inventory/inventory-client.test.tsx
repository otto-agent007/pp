import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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

    expect(screen.getAllByText("Low stock")).toHaveLength(2);
    expect(screen.getAllByText("Bait Gel").length).toBeGreaterThan(0);
    expect(screen.getByText("2 oz | Reorder at 4 oz")).toBeInTheDocument();
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
    const user = userEvent.setup();
    render(<InventoryClient />);

    await user.type(screen.getByLabelText("Name"), "Dust");
    await user.type(screen.getByLabelText("EPA number"), "EPA-999");
    await user.click(screen.getByRole("button", { name: "Save chemical" }));

    expect(createInventoryMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Dust", epa_number: "EPA-999" }),
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save chemical" }));

    expect(updateInventoryMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "chemical-1",
        input: expect.objectContaining({ name: "Bait Gel" }),
      }),
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

    await user.selectOptions(screen.getByLabelText("Job"), "job-1");
    await user.selectOptions(screen.getByLabelText("Chemical"), "chemical-1");
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
});
