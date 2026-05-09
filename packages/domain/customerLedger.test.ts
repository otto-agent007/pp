import { describe, expect, it } from "vitest";
import type { Customer, Invoice, Job } from "@pest-patrol/types";

import {
  buildBillingPortalNextActions,
  buildCustomerLedger,
  getCustomerLedgerSummary,
} from "./customerLedger";

const now = "2026-05-05T00:00:00Z";
const customer: Customer = {
  id: "customer-1",
  name: "Apex Homes",
  phone: null,
  email: null,
  property_type: "residential",
  service_notes: null,
  status: "active",
  created_at: now,
  updated_at: now,
};
const otherCustomer = { ...customer, id: "customer-2", name: "Other" };
const completedJob: Job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  status: "completed",
  scheduled_start: "2026-05-04T09:00:00Z",
  scheduled_end: null,
  service_notes: "Interior service",
  created_at: now,
  updated_at: now,
  customer,
  location: {
    id: "location-1",
    customer_id: "customer-1",
    address: "10 Pine Street",
    nickname: "Main house",
    service_notes: null,
    is_primary: true,
    status: "active",
    created_at: now,
    updated_at: now,
  },
};
const scheduledJob: Job = {
  ...completedJob,
  id: "job-2",
  status: "scheduled",
  scheduled_start: "2026-05-10T09:00:00Z",
};
const invoice: Invoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "sent",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: "2026-05-20T00:00:00Z",
  notes: null,
  payment_url: "https://pay.example/invoice-1",
  stripe_payment_link_id: null,
  created_at: "2026-05-06T00:00:00Z",
  updated_at: "2026-05-06T00:00:00Z",
  job: completedJob,
  line_items: [],
  payments: [],
};

describe("customer ledger domain", () => {
  it("builds customer-scoped ledger entries ordered by date", () => {
    const entries = buildCustomerLedger({
      customer,
      invoices: [
        invoice,
        {
          ...invoice,
          id: "invoice-other",
          customer_id: "customer-2",
          job_id: "job-other",
        },
      ],
      jobs: [
        completedJob,
        scheduledJob,
        {
          ...completedJob,
          id: "job-other",
          customer_id: "customer-2",
          customer: otherCustomer,
        },
      ],
    });

    expect(entries.map((entry) => entry.type)).toEqual([
      "scheduled_service",
      "sent_invoice",
      "completed_service",
    ]);
    expect(entries.every((entry) => entry.customer_id === "customer-1")).toBe(true);
    expect(entries[1]).toMatchObject({
      amount_cents: 12500,
      balance_cents: 12500,
      invoice_id: "invoice-1",
      label: "Invoice sent",
    });
  });

  it("reuses invoice reconciliation states for ledger summaries", () => {
    const partialInvoice: Invoice = {
      ...invoice,
      id: "invoice-partial",
      total_cents: 20000,
      payments: [
        {
          id: "payment-1",
          invoice_id: "invoice-partial",
          provider: "stripe",
          provider_payment_id: "pi_secret",
          status: "succeeded",
          amount_cents: 5000,
          currency: "usd",
          paid_at: "2026-05-07T00:00:00Z",
          created_at: "2026-05-07T00:00:00Z",
          updated_at: "2026-05-07T00:00:00Z",
        },
      ],
    };
    const reviewInvoice: Invoice = {
      ...invoice,
      id: "invoice-review",
      created_at: "2026-05-08T00:00:00Z",
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
          created_at: "2026-05-08T00:00:00Z",
          updated_at: "2026-05-08T00:00:00Z",
        },
      ],
    };

    const entries = buildCustomerLedger({
      customer,
      invoices: [partialInvoice, reviewInvoice],
      jobs: [],
    });
    const summary = getCustomerLedgerSummary(entries);

    expect(entries.map((entry) => entry.type)).toEqual([
      "needs_review_payment",
      "partial_payment",
    ]);
    expect(summary).toMatchObject({
      latestInvoiceAt: "2026-05-08T00:00:00Z",
      openBalanceCents: 27500,
      paidCents: 5000,
      reviewCount: 1,
    });
    expect(JSON.stringify(entries)).not.toContain("pi_secret");
  });

  it("returns an empty summary for customers with no activity", () => {
    expect(getCustomerLedgerSummary([])).toEqual({
      latestInvoiceAt: null,
      latestServiceAt: null,
      openBalanceCents: 0,
      paidCents: 0,
      reviewCount: 0,
    });
  });

  it("builds billing and portal next actions", () => {
    const actions = buildBillingPortalNextActions({
      hasPortalLink: false,
      invoice,
      job: completedJob,
    });

    expect(actions.map((action) => action.id)).toEqual([
      "review_payment",
      "share_portal",
      "open_customer_ledger",
    ]);
    expect(
      buildBillingPortalNextActions({
        hasPortalLink: true,
        job: { ...completedJob, id: "job-ready" },
      }).map((action) => action.id),
    ).toEqual(["create_invoice", "open_customer_ledger"]);
  });
});
