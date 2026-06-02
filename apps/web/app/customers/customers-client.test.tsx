import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomersClient } from "./customers-client";
import { useJobs } from "../../hooks/useJobs";
import {
  useArchiveCustomer,
  useCreateCustomer,
  useCustomers,
  useUpdateCustomer,
} from "../../hooks/useCustomers";
import { useInvoices } from "../../hooks/usePayments";

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("../../hooks/useCustomers", () => ({
  useArchiveCustomer: vi.fn(),
  useCreateCustomer: vi.fn(),
  useCustomers: vi.fn(),
  useUpdateCustomer: vi.fn(),
}));

vi.mock("../../hooks/usePayments", () => ({
  useInvoices: vi.fn(),
}));

vi.mock("./customer-portal-links", () => ({
  CustomerPortalLinks: ({
    customerContact,
    customerId,
  }: {
    customerContact?: { email: string | null; phone: string | null };
    customerId: string;
  }) => (
    <div>
      Portal links for {customerId}
      {customerContact
        ? ` (${customerContact.phone ?? "no phone"} / ${
            customerContact.email ?? "no email"
          })`
        : null}
    </div>
  ),
}));

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

const secondActiveCustomer = {
  ...activeCustomer,
  id: "customer-3",
  name: "Bayview Bakery",
  phone: "555-2222",
  email: "bakery@example.com",
  property_type: "commercial",
  locations: [
    {
      id: "location-3",
      customer_id: "customer-3",
      address: "20 Market Street",
      nickname: "Kitchen",
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
const completedJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: "2026-05-06T09:00:00.000Z",
  scheduled_end: null,
  status: "completed",
  service_notes: "Quarterly service",
  created_at: "2026-05-05T00:00:00Z",
  updated_at: "2026-05-06T00:00:00Z",
  customer: activeCustomer,
  location: activeCustomer.locations[0],
} as const;
const scheduledJob = {
  ...completedJob,
  id: "job-2",
  scheduled_start: "2026-05-04T09:00:00.000Z",
  status: "scheduled",
  service_notes: "Follow-up inspection",
} as const;
const sentInvoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "sent",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: "2026-05-20T00:00:00Z",
  notes: "Internal invoice note should stay off the card",
  payment_url: "https://pay.stripe.com/test",
  stripe_payment_link_id: "plink_secret_should_not_render",
  created_at: "2026-05-07T00:00:00Z",
  updated_at: "2026-05-07T00:00:00Z",
  job: completedJob,
  customer: activeCustomer,
  line_items: [],
  payments: [
    {
      id: "payment-1",
      invoice_id: "invoice-1",
      provider: "stripe",
      provider_payment_id: "pi_secret_should_not_render",
      status: "succeeded",
      amount_cents: 2500,
      currency: "usd",
      paid_at: "2026-05-08T00:00:00Z",
      created_at: "2026-05-08T00:00:00Z",
      updated_at: "2026-05-08T00:00:00Z",
    },
  ],
} as const;
const paidInvoice = {
  ...sentInvoice,
  id: "invoice-paid",
  job_id: "job-2",
  status: "paid",
  total_cents: 5000,
  created_at: "2026-05-09T00:00:00Z",
  updated_at: "2026-05-09T00:00:00Z",
  payments: [
    {
      id: "payment-paid",
      invoice_id: "invoice-paid",
      provider: "stripe",
      provider_payment_id: "pi_paid_secret_should_not_render",
      status: "succeeded",
      amount_cents: 5000,
      currency: "usd",
      paid_at: "2026-05-09T00:00:00Z",
      created_at: "2026-05-09T00:00:00Z",
      updated_at: "2026-05-09T00:00:00Z",
    },
  ],
} as const;
const draftInvoice = {
  ...sentInvoice,
  id: "invoice-draft",
  status: "draft",
  total_cents: 8000,
  created_at: "2026-05-10T00:00:00Z",
  updated_at: "2026-05-10T00:00:00Z",
  payments: [],
} as const;
const reviewInvoice = {
  ...sentInvoice,
  id: "invoice-review",
  status: "sent",
  total_cents: 9000,
  created_at: "2026-05-11T00:00:00Z",
  updated_at: "2026-05-11T00:00:00Z",
  payments: [
    {
      id: "payment-review",
      invoice_id: "invoice-review",
      provider: "stripe",
      provider_payment_id: "pi_pending_secret_should_not_render",
      status: "pending",
      amount_cents: 9000,
      currency: "usd",
      paid_at: null,
      created_at: "2026-05-11T00:00:00Z",
      updated_at: "2026-05-11T00:00:00Z",
    },
  ],
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
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [sentInvoice],
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
    render(<CustomersClient />);

    fireEvent.change(screen.getByLabelText("Search customers"), {
      target: { value: "missing" },
    });

    expect(screen.getByText("No customers found")).toBeInTheDocument();
  });

  it("renders portal link management for active customers", () => {
    render(<CustomersClient />);

    const portalLinks = screen.getByText(
      (_content, element) =>
        element?.textContent ===
        "Portal links for customer-1 (555-1111 / owner@example.com)",
    );
    const ledger = screen.getByText("Account ledger");

    expect(portalLinks).toBeInTheDocument();
    expect(screen.getAllByText(/Portal links for/)).toHaveLength(1);
    expect(screen.getAllByText("Account ledger")).toHaveLength(1);
    expect(
      portalLinks.compareDocumentPosition(ledger) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders a compact ledger summary without provider payment metadata", () => {
    render(<CustomersClient />);

    const followUp = screen.getByLabelText("Account follow-up for Apex Homes");
    expect(within(followUp).getByText("Open balance")).toBeInTheDocument();
    expect(
      within(followUp).getByText(
        "Customer has an open balance; billing context is ready for portal review.",
      ),
    ).toBeInTheDocument();
    expect(
      within(followUp).getByRole("link", { name: "Open billing" }),
    ).toHaveAttribute("href", "/payments?customer_id=customer-1");
    expect(screen.getByText("Account ledger")).toBeInTheDocument();
    expect(
      screen.getByText("Account ledger").closest(".rounded-lg"),
    ).toHaveClass(
      "bg-status-alert-warning-bg",
      "border-status-alert-warning-border",
    );
    expect(
      screen.getByText("Open balance", { selector: "dt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("Paid total")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("Latest service May 6, 2026")).toBeInTheDocument();
    expect(screen.getByText("Partial payment")).toBeInTheDocument();
    expect(screen.getByText("Service completed")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("pi_secret_should_not_render");
    expect(document.body).not.toHaveTextContent(
      "plink_secret_should_not_render",
    );
  });

  it("switches the selected customer workspace without rendering every account workflow", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomers).mockReturnValue({
      data: [activeCustomer, secondActiveCustomer, archivedCustomer],
      isLoading: false,
    } as never);

    render(<CustomersClient />);

    expect(screen.getByText(/Portal links for customer-1/)).toBeInTheDocument();
    expect(screen.getAllByText(/Portal links for/)).toHaveLength(1);

    await user.click(
      screen.getByRole("button", { name: "Select Bayview Bakery" }),
    );

    expect(screen.getByRole("heading", { name: "Bayview Bakery" }));
    expect(screen.getByText(/Portal links for customer-3/)).toBeInTheDocument();
    expect(screen.queryByText(/Portal links for customer-1/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Portal links for/)).toHaveLength(1);
  });

  it("moves selection when filters hide the selected customer", async () => {
    const user = userEvent.setup();
    vi.mocked(useCustomers).mockReturnValue({
      data: [activeCustomer, secondActiveCustomer, archivedCustomer],
      isLoading: false,
    } as never);

    render(<CustomersClient />);

    await user.click(
      screen.getByRole("button", { name: "Select Bayview Bakery" }),
    );
    expect(screen.getByText(/Portal links for customer-3/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search customers"), {
      target: { value: "Apex" },
    });

    expect(screen.getByText(/Portal links for customer-1/)).toBeInTheDocument();
    expect(screen.queryByText(/Portal links for customer-3/)).not.toBeInTheDocument();
  });

  it("preselects a customer from customer handoff links", () => {
    vi.mocked(useCustomers).mockReturnValue({
      data: [activeCustomer, secondActiveCustomer, archivedCustomer],
      isLoading: false,
    } as never);

    render(<CustomersClient requestedCustomerId="customer-3" />);

    expect(screen.getByRole("heading", { name: "Bayview Bakery" }));
    expect(screen.getByText(/Portal links for customer-3/)).toBeInTheDocument();
    expect(screen.queryByText(/Portal links for customer-1/)).not.toBeInTheDocument();
  });

  it("expands the customer ledger and filters service activity", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [sentInvoice, paidInvoice, draftInvoice, reviewInvoice],
      isLoading: false,
    } as never);

    render(<CustomersClient />);

    expect(
      screen.queryByRole("link", { name: "View closeout" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show all activity" }));

    expect(screen.getByRole("tab", { name: /All6/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Services2/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Invoices4/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Open2/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Review1/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Services2/ }));

    expect(screen.getByText("Service completed")).toBeInTheDocument();
    expect(screen.getByText("Service scheduled")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View closeout" })).toHaveAttribute(
      "href",
      "/closeouts?job_id=job-1",
    );
    expect(screen.getByRole("link", { name: "View job" })).toHaveAttribute(
      "href",
      "/jobs?job_id=job-2",
    );
  });

  it("shows review alerts and invoice actions without exposing provider metadata", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [sentInvoice, paidInvoice, draftInvoice, reviewInvoice],
      isLoading: false,
    } as never);

    render(<CustomersClient />);

    const followUp = screen.getByLabelText("Account follow-up for Apex Homes");
    expect(
      within(followUp).getByText("Review payment", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      within(followUp).getByRole("link", { name: "Review payment" }),
    ).toHaveAttribute("href", "/payments?customer_id=customer-1&filter=review");
    expect(screen.getByText("1 payment needs review.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review →" })).toHaveAttribute(
      "href",
      "/payments?customer_id=customer-1&filter=review",
    );

    await user.click(screen.getByRole("button", { name: "Show all activity" }));

    expect(
      screen
        .getAllByRole("link", { name: "Review payment" })
        .some(
          (link) =>
            link.getAttribute("href") === "/payments?invoice_id=invoice-review",
        ),
    ).toBe(true);
    expect(screen.getByRole("link", { name: "View receipt" })).toHaveAttribute(
      "href",
      "/payments?invoice_id=invoice-paid",
    );
    expect(
      screen.getAllByRole("link", { name: "Open invoice" })[0],
    ).toHaveAttribute("href", "/payments?invoice_id=invoice-draft");
    expect(document.body).not.toHaveTextContent(
      "pi_pending_secret_should_not_render",
    );
    expect(document.body).not.toHaveTextContent(
      "pi_paid_secret_should_not_render",
    );
    expect(document.body).not.toHaveTextContent("Balance $0.00");
  });

  it("shows an empty filtered ledger state", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, scheduledJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [sentInvoice, paidInvoice, draftInvoice],
      isLoading: false,
    } as never);

    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Show all activity" }));
    await user.click(screen.getByRole("tab", { name: /Review0/ }));

    expect(
      screen.getByText("No review entries for this customer."),
    ).toBeInTheDocument();
  });

  it("shows demo data entry guidance for the next workflow step", () => {
    render(<CustomersClient />);
    fireEvent.click(screen.getByRole("button", { name: "New customer" }));

    const helper = screen.getByText("Customer setup notes").closest("details");
    expect(helper).not.toHaveAttribute("open");
    expect(
      screen.getByText(
        "Save the customer with one active service location, then schedule the first job.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use portal links after closeout and billing are ready.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Schedule job" })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });

  it("filters archived customers", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.selectOptions(
      screen.getByLabelText("Customer status"),
      "archived",
    );

    expect(screen.getAllByText("Archived Shop")).toHaveLength(2);
    expect(screen.queryByText("Apex Homes")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Portal links for customer-1"),
    ).not.toBeInTheDocument();
  });

  it("validates required customer and location fields", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "New customer" }));
    await user.click(screen.getByRole("button", { name: "Save customer" }));
    expect(screen.getByText("Customer name is required")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "New Customer");
    await user.click(screen.getByRole("button", { name: "Save customer" }));
    expect(
      screen.getByText("Location address is required"),
    ).toBeInTheDocument();
  });

  it("adds and removes inline locations before saving", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "New customer" }));
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getAllByLabelText("Address")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    expect(screen.getAllByLabelText("Address")).toHaveLength(1);
  });

  it("creates a customer with multiple locations", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "New customer" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Customer" },
    });
    fireEvent.change(screen.getAllByLabelText("Address")[0], {
      target: { value: "10 Pine Street" },
    });
    await user.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getAllByLabelText("Address")[1], {
      target: { value: "20 Oak Avenue" },
    });
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

  it("shows next-action guidance after creating a customer", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "New customer" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New Customer" },
    });
    fireEvent.change(screen.getAllByLabelText("Address")[0], {
      target: { value: "10 Pine Street" },
    });
    await user.click(screen.getByRole("button", { name: "Save customer" }));

    expect(
      await screen.findByText(
        "Customer saved. Schedule the first job next; share portal links when closeout and billing are ready.",
      ),
    ).toBeInTheDocument();
  });

  it("shows next-action guidance after updating a customer", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save customer" }));

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: "customer-1",
      input: expect.objectContaining({ name: "Apex Homes" }),
    });
    expect(
      await screen.findByText(
        "Customer updated. Schedule the first job next; share portal links when closeout and billing are ready.",
      ),
    ).toBeInTheDocument();
  });

  it("archives an active customer", async () => {
    const user = userEvent.setup();
    render(<CustomersClient />);

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(mutateArchive).not.toHaveBeenCalled();
    expect(screen.getByText("Archive this customer?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm archive" }));

    expect(mutateArchive).toHaveBeenCalledWith("customer-1");
  });
});
