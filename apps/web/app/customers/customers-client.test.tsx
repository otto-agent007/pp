import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "./customers-client";
import {
  useArchiveCustomer,
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../../hooks/useCustomers";

vi.mock("../../hooks/useCustomers", () => ({
  useArchiveCustomer: vi.fn(),
  useCreateCustomer: vi.fn(),
  useCustomers: vi.fn(),
  useUpdateCustomer: vi.fn(),
}));

vi.mock("./customer-portal-links", () => ({
  CustomerPortalLinks: ({ customerId }: { customerId: string }) => (
    <div>Portal links for {customerId}</div>
  ),
}));

const activeCustomer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: "555-1111",
  email: "owner@example.com",
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: "2026-05-05T00:00:00Z",
  updated_at: "2026-05-05T00:00:00Z",
  locations: [
    {
      id: "location-1",
      customer_id: "customer-1",
      address: "10 Pine Street",
      nickname: null,
      service_notes: null,
      is_primary: true,
      status: "active",
      created_at: "2026-05-05T00:00:00Z",
      updated_at: "2026-05-05T00:00:00Z",
    },
  ],
} as const;

const archivedCustomer = {
  ...activeCustomer,
  id: "customer-2",
  name: "Archived Shop",
  status: "archived",
  locations: [],
} as const;

describe("CustomersClient", () => {
  const mutateArchive = vi.fn();
  const createMutateAsync = vi.fn();
  const updateMutateAsync = vi.fn();

  beforeEach(() => {
    vi.mocked(useCustomers).mockReturnValue({
      data: [activeCustomer, archivedCustomer],
      isLoading: false,
    } as never);
    vi.mocked(useArchiveCustomer).mockReturnValue({
      mutate: mutateArchive,
      isPending: false,
    } as never);
    vi.mocked(useCreateCustomer).mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as never);
    vi.mocked(useUpdateCustomer).mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as never);
    mutateArchive.mockReset();
    createMutateAsync.mockReset();
    updateMutateAsync.mockReset();
    createMutateAsync.mockResolvedValue(activeCustomer);
    updateMutateAsync.mockResolvedValue(activeCustomer);
  });

  it("renders an empty state when active search has no matches", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.type(screen.getByLabelText("Search customers"), "missing");

    expect(screen.getByText("No customers found")).toBeInTheDocument();
  });

  it("renders portal link management for active customers", () => {
    render(<CustomersClient />);

    expect(screen.getByText("Portal links for customer-1")).toBeInTheDocument();
  });

  it("filters archived customers", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.selectOptions(screen.getByLabelText("Customer status"), "archived");

    expect(screen.getByText("Archived Shop")).toBeInTheDocument();
    expect(screen.queryByText("Apex Homes")).not.toBeInTheDocument();
    expect(screen.queryByText("Portal links for customer-1")).not.toBeInTheDocument();
  });

  it("validates required customer and location fields", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Save customer" }));
    expect(screen.getByText("Customer name is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "New Customer");
    await user.click(screen.getByRole("button", { name: "Save customer" }));
    expect(screen.getByText("Location address is required")).toBeInTheDocument();
  });

  it("adds and removes inline locations before saving", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getAllByLabelText("Address")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    expect(screen.getAllByLabelText("Address")).toHaveLength(1);
  });

  it("creates a customer with multiple locations", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.type(screen.getByLabelText("Name"), "New Customer");
    await user.type(screen.getAllByLabelText("Address")[0], "10 Pine Street");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.type(screen.getAllByLabelText("Address")[1], "20 Oak Avenue");
    await user.click(screen.getByRole("button", { name: "Save customer" }));

    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Customer",
        locations: expect.arrayContaining([
          expect.objectContaining({ address: "10 Pine Street" }),
          expect.objectContaining({ address: "20 Oak Avenue" }),
        ]),
      }),
    );
  });

  it("archives an active customer", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(mutateArchive).toHaveBeenCalledWith("customer-1");
  });
});
