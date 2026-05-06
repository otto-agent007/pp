import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@pest-patrol/types";

import {
  createInvoicePaymentLinkRecord,
  createInvoiceRecord,
  listCustomerPortalInvoiceRecords,
  listInvoiceRecords,
  updateInvoiceStatusRecord,
} from "./payments";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  in(...args: unknown[]) {
    this.calls.push(["in", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-06T00:00:00.000Z";
const invoice: Invoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "draft",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: null,
  notes: null,
  payment_url: null,
  stripe_payment_link_id: null,
  created_at: now,
  updated_at: now,
  line_items: [],
  payments: [],
};

describe("payments api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
    vi.restoreAllMocks();
  });

  it("lists invoices with jobs, customers, line items, and payments", async () => {
    const listQuery = new MockQuery({ data: [invoice], error: null });
    from.mockReturnValue(listQuery as never);

    const invoices = await listInvoiceRecords();

    expect(invoices).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("invoices");
    expect(listQuery.calls[0][0]).toBe("select");
  });

  it("lists customer portal invoices with customer and sent/paid scoping", async () => {
    const listQuery = new MockQuery({ data: [invoice], error: null });
    from.mockReturnValue(listQuery as never);

    const invoices = await listCustomerPortalInvoiceRecords("customer-1");

    expect(invoices).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("invoices");
    expect(listQuery.calls).toContainEqual(["eq", ["customer_id", "customer-1"]]);
    expect(listQuery.calls).toContainEqual(["in", ["status", ["sent", "paid"]]]);
  });

  it("creates an invoice and line items", async () => {
    const createQuery = new MockQuery({ data: invoice, error: null });
    const lineItemsQuery = new MockQuery({ data: null, error: null });
    const readQuery = new MockQuery({ data: invoice, error: null });
    from
      .mockReturnValueOnce(createQuery as never)
      .mockReturnValueOnce(lineItemsQuery as never)
      .mockReturnValueOnce(readQuery as never);

    await createInvoiceRecord({
      job_id: "job-1",
      customer_id: "customer-1",
      currency: "usd",
      line_items: [
        {
          description: "Service",
          quantity: 1,
          unit_amount_cents: 12500,
        },
      ],
    });

    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          job_id: "job-1",
          total_cents: 12500,
        }),
      ],
    ]);
    expect(lineItemsQuery.calls[0]).toEqual([
      "insert",
      [
        [
          expect.objectContaining({
            invoice_id: "invoice-1",
            total_cents: 12500,
          }),
        ],
      ],
    ]);
  });

  it("updates invoice status", async () => {
    const updateQuery = new MockQuery({
      data: { ...invoice, status: "paid" },
      error: null,
    });
    from.mockReturnValue(updateQuery as never);

    const updated = await updateInvoiceStatusRecord("invoice-1", "paid");

    expect(updated.status).toBe("paid");
    expect(updateQuery.calls[0]).toEqual(["update", [{ status: "paid" }]]);
  });

  it("creates payment links through the server route and saves metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        provider: "stripe",
        provider_payment_link_id: "plink_123",
        payment_url: "https://pay.stripe.com/test",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const updateQuery = new MockQuery({
      data: {
        ...invoice,
        status: "sent",
        payment_url: "https://pay.stripe.com/test",
        stripe_payment_link_id: "plink_123",
      },
      error: null,
    });
    from.mockReturnValue(updateQuery as never);

    const updated = await createInvoicePaymentLinkRecord({
      ...invoice,
      line_items: [
        {
          id: "line-1",
          invoice_id: "invoice-1",
          description: "Service",
          quantity: 1,
          unit_amount_cents: 12500,
          total_cents: 12500,
          created_at: now,
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/payment-link",
      expect.objectContaining({ method: "POST" }),
    );
    expect(updated.payment_url).toBe("https://pay.stripe.com/test");
    expect(updateQuery.calls[0][1][0]).toMatchObject({
      status: "sent",
      stripe_payment_link_id: "plink_123",
    });
  });
});
