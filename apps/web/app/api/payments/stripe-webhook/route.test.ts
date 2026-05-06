import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }
}

const now = "2026-05-06T12:00:00.000Z";
const invoice = {
  id: "invoice-1",
  job_id: "job-1",
  customer_id: "customer-1",
  status: "sent",
  currency: "usd",
  subtotal_cents: 12500,
  total_cents: 12500,
  due_date: null,
  notes: null,
  payment_url: "https://pay.stripe.com/test",
  stripe_payment_link_id: "plink_123",
  created_at: now,
  updated_at: now,
};
const payment = {
  id: "payment-1",
  invoice_id: "invoice-1",
  provider: "stripe",
  provider_payment_id: "pi_123",
  status: "succeeded",
  amount_cents: 12500,
  currency: "usd",
  paid_at: now,
  created_at: now,
  updated_at: now,
};

function signPayload(payload: string, secret = "whsec_test") {
  const timestamp = "1778097600";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

function request(event: unknown, signature = signPayload(JSON.stringify(event))) {
  const payload = JSON.stringify(event);

  return new Request("http://localhost/api/payments/stripe-webhook", {
    body: payload,
    headers: {
      "stripe-signature": signature,
    },
    method: "POST",
  });
}

function checkoutCompletedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_123",
        amount_total: 12500,
        created: 1778097600,
        currency: "usd",
        metadata: {
          customer_id: "customer-1",
          invoice_id: "invoice-1",
          job_id: "job-1",
        },
        payment_intent: "pi_123",
        payment_status: "paid",
        ...overrides,
      },
    },
  };
}

describe("stripe webhook route", () => {
  beforeEach(() => {
    serviceClient = {
      from: vi.fn(),
    };
    vi.unstubAllEnvs();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  });

  it("rejects invalid signatures before touching Supabase", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(request(event, "t=1778097600,v1=bad"));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("records a completed Stripe checkout payment and marks the invoice paid", async () => {
    const insertPaymentQuery = new MockQuery({ data: payment, error: null });
    const updateInvoiceQuery = new MockQuery({ data: invoice, error: null });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: invoice, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: { code: "PGRST116" } }))
      .mockReturnValueOnce(insertPaymentQuery)
      .mockReturnValueOnce(updateInvoiceQuery);

    const response = await POST(request(checkoutCompletedEvent()));
    const body = (await response.json()) as {
      invoice_id?: string;
      payment_id?: string;
      status?: string;
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      invoice_id: "invoice-1",
      payment_id: "payment-1",
      status: "processed",
    });
    expect(insertPaymentQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          amount_cents: 12500,
          invoice_id: "invoice-1",
          provider_payment_id: "pi_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(updateInvoiceQuery.calls[0]).toEqual(["update", [{ status: "paid" }]]);
  });

  it("updates an existing payment for duplicate Stripe events instead of inserting again", async () => {
    const updatePaymentQuery = new MockQuery({ data: payment, error: null });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: invoice, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: payment, error: null }))
      .mockReturnValueOnce(updatePaymentQuery)
      .mockReturnValueOnce(new MockQuery({ data: invoice, error: null }));

    const response = await POST(request(checkoutCompletedEvent()));

    expect(response.status).toBe(200);
    expect(updatePaymentQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          provider_payment_id: "pi_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(updatePaymentQuery.calls).toContainEqual(["eq", ["id", "payment-1"]]);
  });

  it("ignores events with missing invoice metadata", async () => {
    const response = await POST(
      request(checkoutCompletedEvent({ metadata: {} })),
    );
    const body = (await response.json()) as { message?: string; status?: string };

    expect(response.status).toBe(202);
    expect(body.status).toBe("ignored");
    expect(body.message).toContain("metadata is incomplete");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("ignores events that point at a missing invoice", async () => {
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: null, error: { code: "PGRST116" } }),
    );

    const response = await POST(request(checkoutCompletedEvent()));
    const body = (await response.json()) as {
      invoice_id?: string;
      message?: string;
      status?: string;
    };

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      invoice_id: "invoice-1",
      status: "ignored",
    });
    expect(body.message).toContain("invoice was not found");
  });
});
