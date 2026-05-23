import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
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

vi.mock("../../hooks/useCloseouts", () => ({
  useCloseoutCaptureSummaries: vi.fn(),
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
const reconciledInvoice = {
  ...invoice,
  id: "invoice-reconciled",
  job_id: "job-2",
  status: "paid",
  total_cents: 20000,
  job: secondCompletedJob,
  payments: [
    {
      id: "payment-reconciled",
      invoice_id: "invoice-reconciled",
      provider: "stripe",
      provider_payment_id: "pi_reconciled",
      status: "succeeded",
      amount_cents: 20000,
      currency: "usd",
      paid_at: "2026-05-07T12:00:00.000Z",
      created_at: now,
      updated_at: now,
    },
  ],
} as const;
const manualPaidInvoice = {
  ...invoice,
  id: "invoice-manual",
  status: "paid",
  payments: [],
} as const;
const needsReviewInvoice = {
  ...invoice,
  id: "invoice-review",
  status: "sent",
  payments: [
    {
      id: "payment-failed",
      invoice_id: "invoice-review",
      provider: "stripe",
      provider_payment_id: "pi_failed",
      status: "failed",
      amount_cents: 12500,
      currency: "usd",
      paid_at: null,
      created_at: now,
      updated_at: now,
    },
  ],
} as const;

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
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [fullSummary("job-1")],
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

    expect(screen.getByText("Payment workspace")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation snapshot")).toBeInTheDocument();
    expect(screen.getByText("Manual fallback mode")).toBeInTheDocument();
    expect(screen.getByText("Apex Homes")).toBeInTheDocument();
    expect(screen.getAllByText("$125.00").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Draft 1/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search invoices"), "missing");

    expect(screen.getByText("No invoices found")).toBeInTheDocument();
  });

  it("uses shared count tiles for payment filters without changing invoice data", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [invoice, reconciledInvoice, needsReviewInvoice],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    await user.click(screen.getByRole("button", { name: /Paid \$200\.00/i }));

    expect(screen.getByText("20 Oak Avenue")).toBeInTheDocument();
    expect(screen.queryByText("10 Pine Street")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paid \$200\.00/i }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Needs review 1/i }));

    expect(screen.getByText("Failed payment activity")).toBeInTheDocument();
    expect(screen.queryByText("20 Oak Avenue")).not.toBeInTheDocument();
  });

  it("shows Stripe test-mode setup guidance without exposing secrets", () => {
    render(<PaymentsClient />);

    const providerReadiness = screen
      .getByText("Payment provider readiness")
      .closest("details");

    expect(providerReadiness).not.toHaveAttribute("open");
    expect(
      screen.getByText(
        "Manual payment fallback is active for provider-free demos.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Payment links and webhook receipts stay deferred until provider setup is approved.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Invoices and manual paid status still work for non-payment demos without Stripe.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/sk_test_/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/STRIPE_/i)).not.toBeInTheDocument();
  });

  it("shows a closeouts handoff strip with billing queue counts", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [
        completedJob,
        {
          ...secondCompletedJob,
          id: "job-3",
        },
      ],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [fullSummary("job-1"), { ...fullSummary("job-3"), photos: 0 }],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(screen.getByText("Closeout handoff ready")).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 ready to invoice from closeouts; 1 still needs field captures.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create invoices for ready closeouts or review the queue.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use closeouts to confirm proof handoff, GPS evidence, and customer-safe portal readiness before invoicing.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View queue" })).toHaveAttribute(
      "href",
      "/closeouts",
    );
  });

  it("renders reconciliation labels, totals, and review filtering", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [invoice, reconciledInvoice, manualPaidInvoice, needsReviewInvoice],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(screen.getAllByText("Needs review").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(
      screen
        .getAllByText("Needs review")
        .some((element) =>
          element.className.includes("text-status-alert-danger-fg"),
        ),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /Needs review 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Reconciled paid").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("Manually marked paid").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Failed payment activity")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Failed payment activity needs review before this invoice is reconciled.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review the payment record or confirm a manual status after office verification.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Successful payment records cover this invoice balance.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Marked paid manually; no successful provider payment is attached.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Paid $200.00")).toBeInTheDocument();
    expect(screen.getAllByText("Balance $125.00")).toHaveLength(2);
    expect(screen.getAllByText("Balance $0.00").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getByText("Latest payment May 7, 2026")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Reconciliation status"),
      "needs_review",
    );

    expect(screen.getByText("Failed payment activity")).toBeInTheDocument();
    expect(
      screen.queryByText("Latest payment May 7, 2026"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("20 Oak Avenue")).not.toBeInTheDocument();
  });

  it("shows customer and portal handoff actions for sent invoices", () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [invoice, { ...invoice, id: "invoice-sent", status: "sent" }],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    const invoiceCards = screen.getAllByText("Customer handoff");
    expect(invoiceCards).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Share portal" })).toHaveAttribute(
      "href",
      "/customers?customer_id=customer-1",
    );
    expect(
      within(invoiceCards[0].closest("div") as HTMLElement).getByRole("link", {
        name: "Open customer ledger",
      }),
    ).toHaveAttribute("href", "/customers?customer_id=customer-1");
  });

  it("creates an invoice from a completed job", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    render(<PaymentsClient />);

    expect(
      screen.getByText(
        "Only completed jobs appear here so invoices start from closeout-ready work.",
      ),
    ).toBeInTheDocument();

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

    expect(
      (
        screen.getByRole("combobox", {
          name: "Completed job",
        }) as HTMLInputElement
      ).value,
    ).toContain("20 Oak Avenue");
    expect(
      screen.getByText("From closeout: Apex Homes @ 20 Oak Avenue"),
    ).toBeInTheDocument();

    await chooseSearchableOption(
      user,
      "Completed job",
      "pine",
      /10 Pine Street/,
    );

    expect(
      screen.queryByText("From closeout: Apex Homes @ 20 Oak Avenue"),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Invoice amount"), "225");
    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    expect(createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: "job-1",
        notes: "Quarterly service",
      }),
    );
  });

  it("creates payment links and confirms paid or void status changes", async () => {
    const user = userEvent.setup();
    render(<PaymentsClient />);

    await user.click(screen.getByRole("button", { name: "Create link" }));

    expect(createPaymentLink).toHaveBeenCalledWith(invoice);

    await user.click(screen.getByRole("button", { name: "Mark paid" }));

    expect(markPaid).not.toHaveBeenCalled();
    expect(screen.getByText("Mark this invoice paid?")).toBeInTheDocument();
    expect(
      screen.getByText("Apex Homes · invoice invoice-1 · $125.00"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Confirm the customer paid outside provider sync before marking paid. This does not create a provider charge.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel mark paid" }));

    expect(
      screen.queryByText("Mark this invoice paid?"),
    ).not.toBeInTheDocument();
    expect(markPaid).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mark paid" }));
    await user.click(screen.getByRole("button", { name: "Confirm mark paid" }));

    expect(markPaid).toHaveBeenCalledWith("invoice-1");

    await user.click(screen.getByRole("button", { name: "Void" }));

    expect(voidInvoice).not.toHaveBeenCalled();
    expect(screen.getByText("Void this invoice?")).toBeInTheDocument();
    expect(
      screen.getByText("Apex Homes · invoice invoice-1 · $125.00"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Void only if this invoice should leave active collection. Existing payment records remain audit history.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel void" }));

    expect(screen.queryByText("Void this invoice?")).not.toBeInTheDocument();
    expect(voidInvoice).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Void" }));
    await user.click(screen.getByRole("button", { name: "Confirm void" }));

    expect(voidInvoice).toHaveBeenCalledWith("invoice-1");
  });
});

function fullSummary(jobId: string) {
  return {
    chemicalLogs: 1,
    forms: 1,
    jobId,
    photos: 1,
    signatures: 1,
  };
}
