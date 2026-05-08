import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useJobs } from "../../hooks/useJobs";
import {
  useCreateInvoice,
  useCreateInvoicePaymentLink,
  useInvoices,
  useMarkInvoicePaid,
  useVoidInvoice,
} from "../../hooks/usePayments";
import { PaymentsClient } from "./payments-client";

const searchParams = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("../../hooks/useJobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock("../../hooks/usePayments", () => ({
  useCreateInvoice: vi.fn(),
  useCreateInvoicePaymentLink: vi.fn(),
  useInvoices: vi.fn(),
  useMarkInvoicePaid: vi.fn(),
  useVoidInvoice: vi.fn(),
}));

const now = "2026-05-06T00:00:00.000Z";
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
} as const;
const location = {
  id: "location-1",
  customer_id: "customer-1",
  address: "10 Pine Street",
  nickname: null,
  service_notes: null,
  is_primary: true,
  status: "active",
  created_at: now,
  updated_at: now,
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
  created_at: now,
  updated_at: now,
  customer,
  location,
} as const;
const secondCompletedJob = {
  ...completedJob,
  id: "job-2",
  location_id: "location-2",
  service_notes: "Follow-up service",
  location: {
    ...location,
    id: "location-2",
    address: "20 Oak Avenue",
  },
} as const;
const invoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "draft",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: null,
  notes: "Quarterly service",
  payment_url: null,
  stripe_payment_link_id: null,
  created_at: now,
  updated_at: now,
  job: completedJob,
  customer,
  line_items: [
    {
      id: "line-1",
      invoice_id: "invoice-1",
      description: "Pest control service",
      quantity: 1,
      unit_amount_cents: 12500,
      total_cents: 12500,
      created_at: now,
    },
  ],
  payments: [],
} as const;

describe("PaymentsClient", () => {
  const createInvoice = vi.fn();
  const createPaymentLink = vi.fn();
  const markPaid = vi.fn();
  const voidInvoice = vi.fn();

  beforeEach(() => {
    searchParams.value = new URLSearchParams();
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [invoice],
      isLoading: false,
    } as never);
    vi.mocked(useCreateInvoice).mockReturnValue({
      mutateAsync: createInvoice,
      isPending: false,
    } as never);
    vi.mocked(useCreateInvoicePaymentLink).mockReturnValue({
      mutate: createPaymentLink,
      isPending: false,
    } as never);
    vi.mocked(useMarkInvoicePaid).mockReturnValue({
      mutate: markPaid,
      isPending: false,
    } as never);
    vi.mocked(useVoidInvoice).mockReturnValue({
      mutate: voidInvoice,
      isPending: false,
    } as never);
    createInvoice.mockReset();
    createPaymentLink.mockReset();
    markPaid.mockReset();
    voidInvoice.mockReset();
    createInvoice.mockResolvedValue(invoice);
  });

  it("renders invoice summaries and filters invoices", async () => {
    const user = userEvent.setup();
    render(<PaymentsClient />);

    expect(screen.getByText("Apex Homes")).toBeInTheDocument();
    expect(screen.getByText("$125.00")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search invoices"), "missing");

    expect(screen.getByText("No invoices found")).toBeInTheDocument();
  });

  it("shows Stripe test-mode setup guidance without exposing secrets", () => {
    render(<PaymentsClient />);

    expect(screen.getByText("Stripe test-mode readiness")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Payment links need server-only STRIPE_SECRET_KEY. Stripe webhooks need STRIPE_WEBHOOK_SECRET.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Stripe can stay unset for customer, job, closeout, and portal demos.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Invoices and manual paid status still work for non-payment demos without Stripe.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sk_test_/i)).not.toBeInTheDocument();
  });

  it("creates an invoice from a completed job", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    render(<PaymentsClient />);

    await user.type(screen.getByLabelText("Invoice amount"), "125");
    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job-1",
        customer_id: "customer-1",
        line_items: [
          expect.objectContaining({
            description: "Pest control service",
            unit_amount_cents: 12500,
          }),
        ],
      }),
    );
  });

  it("preselects a completed job from the closeout handoff query param", async () => {
    const user = userEvent.setup();
    searchParams.value = new URLSearchParams("job_id=job-2");
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, secondCompletedJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(screen.getByLabelText("Completed job")).toHaveValue("job-2");

    await user.type(screen.getByLabelText("Invoice amount"), "225");
    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job-2",
        notes: "Follow-up service",
      }),
    );
  });

  it("creates payment links and updates invoice state", async () => {
    const user = userEvent.setup();
    render(<PaymentsClient />);

    await user.click(screen.getByRole("button", { name: "Create link" }));
    await user.click(screen.getByRole("button", { name: "Mark paid" }));
    await user.click(screen.getByRole("button", { name: "Void" }));

    expect(createPaymentLink).toHaveBeenCalledWith(invoice);
    expect(markPaid).toHaveBeenCalledWith("invoice-1");
    expect(voidInvoice).toHaveBeenCalledWith("invoice-1");
  });
});
