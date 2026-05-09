import { describe, expect, it } from "vitest";
import type { Invoice } from "@pest-patrol/types";

import {
  buildInvoiceInputFromJob,
  buildCustomerPortalInvoices,
  filterCustomerPortalInvoices,
  filterInvoices,
  getCustomerPortalInvoiceStatusLabel,
  getInvoiceBalanceCents,
  getInvoiceHandoffHref,
  getInvoiceInputTotalCents,
  getInvoiceJobIds,
  getInvoiceReconciliation,
  getInvoiceReconciliationSummary,
  getInvoiceSummary,
  validateInvoiceInput,
} from "./payments";

const now = "2026-05-06T00:00:00.000Z";
const job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  status: "completed",
  scheduled_start: now,
  scheduled_end: null,
  service_notes: "Quarterly service",
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

const invoice: Invoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "sent",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: null,
  notes: null,
  payment_url: null,
  stripe_payment_link_id: null,
  created_at: now,
  updated_at: now,
  job,
  customer: job.customer,
  line_items: [],
  payments: [],
};

describe("payments domain", () => {
  it("validates invoice inputs and totals", () => {
    const input = validateInvoiceInput({
      job_id: " job-1 ",
      customer_id: " customer-1 ",
      currency: "USD",
      line_items: [
        {
          description: " Service ",
          quantity: 1,
          unit_amount_cents: 12500,
        },
      ],
    });

    expect(input).toMatchObject({
      job_id: "job-1",
      customer_id: "customer-1",
      currency: "usd",
      line_items: [{ description: "Service" }],
    });
    expect(getInvoiceInputTotalCents(input)).toBe(12500);
  });

  it("rejects missing jobs, missing line items, and invalid amounts", () => {
    expect(() =>
      validateInvoiceInput({
        job_id: "",
        customer_id: "customer-1",
        line_items: [],
      }),
    ).toThrow("At least one invoice line item is required");

    expect(() =>
      validateInvoiceInput({
        job_id: "job-1",
        customer_id: "customer-1",
        line_items: [
          {
            description: "Service",
            quantity: 1,
            unit_amount_cents: 0,
          },
        ],
      }),
    ).toThrow("Line item amount must be greater than zero");
  });

  it("builds invoice input from a completed job", () => {
    expect(buildInvoiceInputFromJob(job, 12500)).toMatchObject({
      job_id: "job-1",
      customer_id: "customer-1",
      notes: "Quarterly service",
      line_items: [{ unit_amount_cents: 12500 }],
    });
  });

  it("builds a closeout to invoice handoff href", () => {
    expect(getInvoiceHandoffHref("job-1")).toBe("/payments?job_id=job-1");
    expect(getInvoiceHandoffHref("job 1")).toBe("/payments?job_id=job%201");
    expect(() => getInvoiceHandoffHref(" ")).toThrow("Job is required");
  });

  it("filters invoices and summarizes payment state", () => {
    const paidInvoice: Invoice = {
      ...invoice,
      id: "invoice-2",
      job_id: "job-2",
      job: {
        ...job,
        id: "job-2",
        location: { ...job.location, address: "20 Oak Avenue" },
      },
      status: "paid",
      total_cents: 20000,
    };

    expect(filterInvoices([invoice, paidInvoice], "pine", "all")).toEqual([
      invoice,
    ]);
    expect(getInvoiceJobIds([invoice, paidInvoice]).has("job-1")).toBe(true);
    expect(getInvoiceSummary([invoice, paidInvoice])).toEqual({
      draftCount: 0,
      openCents: 12500,
      paidCents: 20000,
      sentCount: 1,
    });
  });

  it("calculates remaining invoice balance", () => {
    expect(
      getInvoiceBalanceCents({
        ...invoice,
        payments: [
          {
            id: "payment-1",
            invoice_id: "invoice-1",
            provider: "stripe",
            provider_payment_id: "pi_123",
            status: "succeeded",
            amount_cents: 5000,
            currency: "usd",
            paid_at: now,
            created_at: now,
            updated_at: now,
          },
        ],
      }),
    ).toBe(7500);
  });

  it("classifies invoice reconciliation state from payment records", () => {
    const partialInvoice: Invoice = {
      ...invoice,
      payments: [
        {
          id: "payment-partial",
          invoice_id: "invoice-1",
          provider: "stripe",
          provider_payment_id: "pi_partial",
          status: "succeeded",
          amount_cents: 5000,
          currency: "usd",
          paid_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    };
    const reconciledInvoice: Invoice = {
      ...invoice,
      id: "invoice-reconciled",
      status: "paid",
      payments: [
        {
          id: "payment-paid",
          invoice_id: "invoice-reconciled",
          provider: "stripe",
          provider_payment_id: "pi_paid",
          status: "succeeded",
          amount_cents: 12500,
          currency: "usd",
          paid_at: "2026-05-07T00:00:00.000Z",
          created_at: now,
          updated_at: now,
        },
      ],
    };
    const manualPaidInvoice: Invoice = {
      ...invoice,
      id: "invoice-manual",
      status: "paid",
    };
    const needsReviewInvoice: Invoice = {
      ...invoice,
      id: "invoice-review",
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
    };
    const voidInvoice: Invoice = {
      ...needsReviewInvoice,
      id: "invoice-void",
      status: "void",
    };

    expect(getInvoiceReconciliation({ ...invoice, status: "draft" })).toMatchObject({
      balanceCents: 12500,
      label: "Draft",
      latestPaidAt: null,
      needsReview: false,
      paidCents: 0,
      status: "draft",
    });
    expect(getInvoiceReconciliation(invoice)).toMatchObject({
      label: "Awaiting payment",
      status: "awaiting_payment",
    });
    expect(getInvoiceReconciliation(partialInvoice)).toMatchObject({
      balanceCents: 7500,
      label: "Partially paid",
      paidCents: 5000,
      status: "partially_paid",
    });
    expect(getInvoiceReconciliation(reconciledInvoice)).toMatchObject({
      balanceCents: 0,
      label: "Reconciled paid",
      latestPaidAt: "2026-05-07T00:00:00.000Z",
      status: "reconciled_paid",
    });
    expect(getInvoiceReconciliation(manualPaidInvoice)).toMatchObject({
      label: "Manually marked paid",
      needsReview: false,
      paidCents: 0,
      status: "manual_paid",
    });
    expect(getInvoiceReconciliation(needsReviewInvoice)).toMatchObject({
      label: "Needs review",
      needsReview: true,
      reviewLabel: "Failed payment activity",
      status: "needs_review",
    });
    expect(getInvoiceReconciliation(voidInvoice)).toMatchObject({
      label: "Void",
      needsReview: false,
      status: "void",
    });
    expect(
      getInvoiceReconciliationSummary([
        invoice,
        partialInvoice,
        needsReviewInvoice,
        voidInvoice,
      ]),
    ).toEqual({
      needsReviewCount: 1,
      paidCents: 5000,
      remainingCents: 32500,
    });
  });

  it("builds customer-safe portal invoices and hides internal payment details", () => {
    const portalInvoices = buildCustomerPortalInvoices([
      {
        ...invoice,
        status: "sent",
        payment_url: "https://pay.stripe.com/test",
        line_items: [
          {
            id: "line-1",
            invoice_id: "invoice-1",
            description: "Quarterly service",
            quantity: 1,
            unit_amount_cents: 12500,
            total_cents: 12500,
            created_at: now,
          },
        ],
        payments: [
          {
            id: "payment-1",
            invoice_id: "invoice-1",
            provider: "stripe",
            provider_payment_id: "pi_secret",
            status: "pending",
            amount_cents: 0,
            currency: "usd",
            paid_at: null,
            created_at: now,
            updated_at: now,
          },
        ],
      },
      {
        ...invoice,
        id: "invoice-void",
        status: "void",
      },
    ]);

    expect(portalInvoices).toHaveLength(1);
    expect(portalInvoices[0]).toMatchObject({
      balance_cents: 12500,
      payment_url: "https://pay.stripe.com/test",
      status: "open",
    });
    expect(JSON.stringify(portalInvoices)).not.toContain("provider_payment_id");
    expect(JSON.stringify(portalInvoices)).not.toContain("pi_secret");
    expect(filterCustomerPortalInvoices(portalInvoices, "quarterly")).toHaveLength(1);
    expect(getCustomerPortalInvoiceStatusLabel("paid")).toBe("Paid");
  });
});
