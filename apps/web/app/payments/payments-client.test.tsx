import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildComplianceGuardrailForJob,
  buildComplianceReviewItems,
  getComplianceGuardrailSummary,
  getComplianceNeedsReviewSummary,
} from "@pest-patrol/domain";
import type { ChemicalLog, Job } from "@pest-patrol/types";

import { useCloseoutCaptureSummaries } from "../../hooks/useCloseouts";
import { useComplianceReviewItems } from "../../hooks/useComplianceReviewItems";
import { useCreateCustomerPortalAccessToken } from "../../hooks/useCustomerPortalAccess";
import { useJobs } from "../../hooks/useJobs";
import {
  useCreateInvoice,
  useCreateInvoicePaymentLink,
  useInvoices,
  useMarkInvoicePaid,
  usePaymentProviderStatus,
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

vi.mock("../../hooks/useCustomerPortalAccess", () => ({
  useCreateCustomerPortalAccessToken: vi.fn(),
}));

vi.mock("../../hooks/useComplianceReviewItems", () => ({
  useComplianceReviewItems: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock("../../hooks/usePayments", () => ({
  useCreateInvoice: vi.fn(),
  useCreateInvoicePaymentLink: vi.fn(),
  useInvoices: vi.fn(),
  useMarkInvoicePaid: vi.fn(),
  usePaymentProviderStatus: vi.fn(),
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
const rodentJob = {
  ...completedJob,
  id: "job-rodent",
  service_notes: "Rodent attic sanitation and access point sealing",
  location: {
    ...location,
    id: "location-rodent",
    address: "30 Cedar Lane",
  },
} as const;
const escrowJob = {
  ...completedJob,
  id: "job-escrow",
  service_notes: "WDO escrow Branch 3 inspection for real estate clearance",
  location: {
    ...location,
    id: "location-escrow",
    address: "40 Market Street",
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
const sentInvoice = {
  ...invoice,
  id: "invoice-sent",
  payment_url: "https://pay.example/invoice-1",
  status: "sent",
  stripe_payment_link_id: "plink_1",
} as const;
const complianceChemicalLog = {
  id: "log-1",
  job_id: "job-1",
  chemical_id: "chemical-1",
  amount_used: 2,
  notes: "Kitchen baseboards",
  created_at: now,
  chemical: {
    id: "chemical-1",
    name: "Bait Gel",
    epa_number: "EPA-123",
    current_stock: 10,
    unit: "oz",
    reorder_level: 4,
    status: "active",
    created_at: now,
    updated_at: now,
  },
  job: completedJob,
} as const;

function mockComplianceReview(
  chemicalLogs: ChemicalLog[] = [],
  jobs: Job[] = [
    completedJob,
    secondCompletedJob,
    rodentJob,
    escrowJob,
  ] as Job[],
  overrides: Partial<ReturnType<typeof useComplianceReviewItems>> = {},
) {
  const items = buildComplianceReviewItems({
    audits: [],
    chemicalLogs,
    chunks: [],
    documents: [],
    jobs,
    sources: [],
  });

  vi.mocked(useComplianceReviewItems).mockReturnValue({
    buildGuardrailForJob: (jobId: string) =>
      buildComplianceGuardrailForJob({ items, jobId }),
    guardrailByJobId: (jobIds: string[]) =>
      new Map(
        Array.from(new Set(jobIds)).map((jobId) => [
          jobId,
          buildComplianceGuardrailForJob({ items, jobId }),
        ]),
      ),
    guardrailSummaryForJobs: (jobIds: string[]) =>
      getComplianceGuardrailSummary({ items, jobIds }),
    isError: false,
    isLoading: false,
    items,
    schemaUnavailable: false,
    setupReadiness: null,
    setupWarning: null,
    summary: getComplianceNeedsReviewSummary(items),
    ...overrides,
  });
}

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
  const createPortalLink = vi.fn();
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
    vi.mocked(usePaymentProviderStatus).mockReturnValue({
      data: {
        live_mode_approved: false,
        manual_fallback: true,
        provider: "stripe",
        readiness_state: "manual_fallback",
        secret_configured: false,
        stripe_key_mode: "missing",
        webhook_secret_configured: false,
      },
      isLoading: false,
    } as never);
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [fullSummary("job-1")],
      isLoading: false,
    } as never);
    mockComplianceReview();
    vi.mocked(useCreateInvoice).mockReturnValue({
      mutateAsync: createInvoice,
      isPending: false,
    } as never);
    vi.mocked(useCreateInvoicePaymentLink).mockReturnValue({
      mutate: createPaymentLink,
      isPending: false,
    } as never);
    vi.mocked(useCreateCustomerPortalAccessToken).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: createPortalLink,
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
    createPortalLink.mockReset();
    markPaid.mockReset();
    voidInvoice.mockReset();
    createInvoice.mockResolvedValue(invoice);
    createPortalLink.mockResolvedValue({
      access_token: "portal-token",
      customer_id: "customer-1",
      expires_at: null,
      portal_url:
        "http://localhost:3000/portal/customer-1?grant=portal-token",
      token_id: "token-portal",
    });
  });

  it("renders invoice summaries and filters invoices", async () => {
    const user = userEvent.setup();
    render(<PaymentsClient />);

    expect(screen.getByText("Payment workspace")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation snapshot")).toBeInTheDocument();
    expect(screen.getAllByText("Manual fallback accepted").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Apex Homes")).toBeInTheDocument();
    expect(screen.getAllByText("$125.00").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Draft 1/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search invoices"), "missing");

    expect(screen.getByText("No invoices found")).toBeInTheDocument();
  });

  it("shows invoice job picker schedules as wall-clock job time", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [
        { ...secondCompletedJob, scheduled_start: "2026-05-06T09:38:00Z" },
      ],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    await user.click(screen.getByRole("combobox", { name: "Completed job" }));

    expect(
      await screen.findByRole("option", {
        name: "5/6/26, 9:38 AM - Apex Homes - 20 Oak Avenue",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /2:38 AM/ }),
    ).not.toBeInTheDocument();
  });

  it("renders service preset selector, quick filters, and inferred preset state", async () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(
      screen.getByRole("combobox", { name: "Service preset" }),
    ).toBeInTheDocument();
    const serviceFamilyFilter = screen.getByLabelText("Service family");
    expect(serviceFamilyFilter).toBeInTheDocument();
    expect(
      within(serviceFamilyFilter).getByRole("option", { name: "General Pest" }),
    ).toBeInTheDocument();
    expect(
      within(serviceFamilyFilter).getByRole("option", { name: "Recurring" }),
    ).toBeInTheDocument();
    expect(
      within(serviceFamilyFilter).getByRole("option", { name: "Termite/WDO" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Auto-selected")).toBeInTheDocument();
    expect(
      (screen.getByRole("combobox", {
        name: "Service preset",
      }) as HTMLInputElement).value,
    ).toContain("Quarterly General Pest");
  });

  it("applies service preset copy without changing amount", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [rodentJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    await user.type(screen.getByLabelText("Invoice amount"), "125");
    await user.click(screen.getByRole("button", { name: "Apply service preset" }));

    expect(screen.getByLabelText("Invoice amount")).toHaveValue(125);
    expect(screen.getByLabelText("Line item description")).toHaveValue(
      "Rodent exclusion and attic sanitation",
    );
    expect(
      (screen.getByLabelText("Invoice notes") as HTMLTextAreaElement).value,
    ).toContain("Rodent exclusion and attic sanitation completed");
  });

  it("preserves operator-entered invoice copy when selecting another job", async () => {
    const user = userEvent.setup();
    vi.mocked(useJobs).mockReturnValue({
      data: [completedJob, secondCompletedJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    await user.click(screen.getByRole("combobox", { name: "Completed job" }));
    await user.click(
      (await screen.findByRole("option", {
        name: /10 Pine Street/,
      })) as HTMLOptionElement,
    );
    await user.type(screen.getByLabelText("Line item description"), "custom");
    await user.type(screen.getByLabelText("Invoice notes"), "custom notes");

    await user.click(screen.getByRole("combobox", { name: "Completed job" }));
    await user.click(
      (await screen.findByRole("option", {
        name: /20 Oak Avenue/,
      })) as HTMLOptionElement,
    );

    expect(
      (screen.getByLabelText("Line item description") as HTMLInputElement).value,
    ).toContain("custom");
    expect(
      (screen.getByLabelText("Invoice notes") as HTMLTextAreaElement).value,
    ).toContain("custom notes");
  });

  it("shows review-only promotion suggestions for eligible presets", () => {
    vi.mocked(useJobs).mockReturnValue({
      data: [escrowJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(
      screen.getByText("Review promo: Real estate agent first-service offer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review-only suggestions; invoice totals stay unchanged."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Invoice amount")).toHaveValue(null);
    expect(
      screen.getByText(
        "Confirm WDO/escrow readiness before final document release.",
      ),
    ).toBeInTheDocument();
  });

  it("does not show WDO document-release guidance for normal pest work", () => {
    render(<PaymentsClient />);

    expect(
      screen.queryByText(
        "Confirm WDO/escrow readiness before final document release.",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows WDO document-release guidance for WDO invoice cards", () => {
    const escrowInvoice = {
      ...invoice,
      id: "invoice-escrow",
      job_id: "job-escrow",
      job: escrowJob,
      notes: "WDO escrow billing",
    } as const;
    vi.mocked(useJobs).mockReturnValue({
      data: [escrowJob],
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [escrowInvoice],
      isLoading: false,
    } as never);
    vi.mocked(useCloseoutCaptureSummaries).mockReturnValue({
      data: [fullSummary("job-escrow")],
      isLoading: false,
    } as never);

    render(<PaymentsClient />);

    expect(
      screen.getAllByText(
        "Confirm WDO/escrow readiness before final document release.",
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Final release requires authorized human review.")
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("link", { name: "Open WDO / Escrow readiness" })[0],
    ).toHaveAttribute("href", "/escrow-re?job_id=job-escrow");
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

  it("shows visible manual fallback readiness without exposing secrets", () => {
    render(<PaymentsClient />);

    const providerReadiness = screen
      .getByText("Payment provider readiness")
      .closest("section");

    expect(providerReadiness).toBeInTheDocument();
    expect(providerReadiness?.tagName).toBe("SECTION");
    expect(
      screen.getByText(
        "Stripe payment links are unavailable. Invoices can still be managed manually.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use manual payment follow-up until Stripe test-mode setup is configured.",
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
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Manually marked paid").length,
    ).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText("Balance due").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$125.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Paid to date").length).toBeGreaterThan(0);
    expect(
      screen.queryByLabelText("Reconciliation status"),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Invoice total").length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      screen.getAllByText("Open balance").length,
    ).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Latest payment May 7, 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Needs review 1/i }));

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

  it("generates a portal QR from invoice handoff without exposing direct payment URLs", async () => {
    const user = userEvent.setup();
    vi.mocked(useInvoices).mockReturnValue({
      data: [sentInvoice],
      isLoading: false,
    } as never);
    mockComplianceReview([complianceChemicalLog as ChemicalLog]);

    render(<PaymentsClient />);

    expect(
      screen.queryByText("Internal compliance warning"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Customer-safe portal proof must not expose internal compliance warnings.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Review service proof before sharing"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Generate customer portal QR" }),
    );

    expect(createPortalLink).toHaveBeenCalledWith({
      customer_id: "customer-1",
      expires_at: null,
    });
    expect(
      await screen.findByRole("img", {
        name: "QR code for customer portal link",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "http://localhost:3000/portal/customer-1?grant=portal-token",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("https://pay.example/invoice-1"),
    ).not.toBeInTheDocument();
  });

  it("shows a compliance guardrail for the selected completed job", () => {
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockComplianceReview([complianceChemicalLog as ChemicalLog]);

    render(<PaymentsClient />);

    expect(
      screen.getByText("Compliance review recommended"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Review missing evidence before closeout, invoice, or portal handoff/i),
    ).toBeInTheDocument();
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
            description: "Quarterly general pest service",
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
        notes: expect.stringContaining("Quarterly general pest service completed"),
      }),
    );
  });

  it("confirms payment links with unresolved compliance review items", async () => {
    const user = userEvent.setup();
    mockComplianceReview([complianceChemicalLog as ChemicalLog]);

    render(<PaymentsClient />);

    expect(screen.queryByText("Internal compliance warning")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create link" }));

    expect(createPaymentLink).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "This invoice has unresolved compliance review items.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review first" })).toHaveAttribute(
      "href",
      "/compliance",
    );

    await user.click(
      screen.getByRole("button", { name: "Create link anyway" }),
    );

    expect(createPaymentLink).toHaveBeenCalledWith(invoice);
  });

  it("keeps payment actions usable when compliance review setup is unavailable", async () => {
    const user = userEvent.setup();
    mockComplianceReview([], undefined, {
      isError: false,
      items: [],
      schemaUnavailable: true,
      setupWarning:
        "Compliance advisory review data is unavailable. Continue the workflow, then review compliance setup from the Compliance page.",
      summary: {
        advisoryItems: 0,
        chemicalItems: 0,
        criticalItems: 0,
        openItems: 0,
        sourceItems: 0,
        warningItems: 0,
        wdoItems: 0,
      },
    });

    render(<PaymentsClient />);

    expect(screen.queryByText(/relation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/compliance_sources/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create link" }));

    expect(createPaymentLink).toHaveBeenCalledWith(invoice);
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
