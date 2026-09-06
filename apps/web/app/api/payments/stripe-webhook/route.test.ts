import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  maybeSingle() {
    this.calls.push(["maybeSingle", []]);
    return Promise.resolve(this.result);
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }
}

const now = "2026-05-06T12:00:00.000Z";
const fakeNow = new Date(now);
const currentTimestamp = Math.floor(fakeNow.getTime() / 1000);
const staleTimestamp = currentTimestamp - 301;
const futureTimestamp = currentTimestamp + 301;

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

const paidInvoice = {
  ...invoice,
  status: "paid",
};

const voidInvoice = {
  ...invoice,
  status: "void",
};

const payment = {
  id: "payment-1",
  invoice_id: "invoice-1",
  provider: "stripe",
  provider_payment_id: "cs_123",
  status: "succeeded",
  amount_cents: 12500,
  currency: "usd",
  paid_at: now,
  created_at: now,
  updated_at: now,
};

function signPayload(
  payload: string,
  timestamp = currentTimestamp,
  secret = "whsec_test",
) {
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

function requestWithoutTimestamp(event: unknown) {
  const payload = JSON.stringify(event);
  const signature = signPayload(payload).replace(/^t=\d+,/, "");

  return request(event, signature);
}

function requestWithMalformedTimestamp(event: unknown) {
  const payload = JSON.stringify(event);
  const signature = signPayload(payload).replace(/^t=\d+/, "t=not-a-number");

  return request(event, signature);
}

function checkoutCompletedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_123",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_123",
        amount_total: 12500,
        created: currentTimestamp,
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

function checkoutAsyncSucceededEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_124",
    type: "checkout.session.async_payment_succeeded",
    data: {
      object: {
        id: "cs_123",
        amount_total: 12500,
        created: currentTimestamp,
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

function checkoutAsyncFailedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_125",
    type: "checkout.session.async_payment_failed",
    data: {
      object: {
        id: "cs_123",
        amount_total: 12500,
        created: currentTimestamp,
        currency: "usd",
        metadata: {
          customer_id: "customer-1",
          invoice_id: "invoice-1",
          job_id: "job-1",
        },
        payment_intent: "pi_123",
        payment_status: "unpaid",
        ...overrides,
      },
    },
  };
}

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
    serviceClient = {
      from: vi.fn(),
    };
    vi.unstubAllEnvs();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    serviceClient.from.mockReset();
  });

  it("rejects invalid signatures before touching Supabase", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(request(event, "t=1778097600,v1=bad"));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects missing Stripe signature timestamps before touching Supabase", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(requestWithoutTimestamp(event));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects malformed Stripe signature timestamps before touching Supabase", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(requestWithMalformedTimestamp(event));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects stale Stripe webhook timestamps before touching Supabase", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(
      request(event, signPayload(JSON.stringify(event), staleTimestamp)),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects future Stripe webhook timestamps outside the tolerance window", async () => {
    const event = checkoutCompletedEvent();
    const response = await POST(
      request(event, signPayload(JSON.stringify(event), futureTimestamp)),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid Stripe webhook signature");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("allows signed test-mode webhooks", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");

    const response = await POST(
      request({
        id: "evt_999",
        livemode: false,
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            metadata: {
              invoice_id: "invoice-1",
            },
          },
        },
      }),
    );
    const body = (await response.json()) as { status?: string };

    expect(response.status).toBe(202);
    expect(body.status).toBe("ignored");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("blocks signed live-mode webhooks before reconciliation without approval", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "false");

    const response = await POST(request(checkoutCompletedEvent()));
    const body = (await response.json()) as { error?: string };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(409);
    expect(body.error).toBe("Stripe live mode is not approved");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(serialized).not.toContain("sk_live_123");
  });

  it("allows signed live-mode webhooks when approval is set", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "true");

    const response = await POST(
      request({
        id: "evt_999",
        livemode: true,
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            metadata: {
              invoice_id: "invoice-1",
            },
          },
        },
      }),
    );
    const body = (await response.json()) as { status?: string };

    expect(response.status).toBe(202);
    expect(body.status).toBe("ignored");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("accepts a current Stripe webhook timestamp and marks the invoice paid", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({ data: payment, error: null });
    const updateInvoiceQuery = new MockQuery({ data: paidInvoice, error: null });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never)
      .mockReturnValueOnce(updateInvoiceQuery as never);

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
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(updateInvoiceQuery.calls[0]).toEqual(["update", [{ status: "paid" }]]);
  });

  it("ignores unsupported Stripe event types safely", async () => {
    const response = await POST(
      request({
        id: "evt_999",
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            metadata: {
              invoice_id: "invoice-1",
            },
          },
        },
      }),
    );
    const body = (await response.json()) as {
      message?: string;
      status?: string;
    };

    expect(response.status).toBe(202);
    expect(body.status).toBe("ignored");
    expect(body.message).toContain("metadata is incomplete");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("updates an existing payment for duplicate Stripe events instead of inserting again", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({ data: payment, error: null });
    const updatePaymentQuery = new MockQuery({ data: payment, error: null });
    const updateInvoiceQuery = new MockQuery({ data: paidInvoice, error: null });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(updatePaymentQuery as never)
      .mockReturnValueOnce(updateInvoiceQuery as never);

    const response = await POST(request(checkoutCompletedEvent()));

    expect(response.status).toBe(200);
    expect(updatePaymentQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(updatePaymentQuery.calls).toContainEqual(["eq", ["id", "payment-1"]]);
  });

  it("does not transition a duplicate paid invoice again", async () => {
    const invoiceQuery = new MockQuery({ data: paidInvoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({ data: payment, error: null });
    const updatePaymentQuery = new MockQuery({ data: payment, error: null });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(updatePaymentQuery as never);

    const response = await POST(request(checkoutCompletedEvent()));

    expect(response.status).toBe(200);
    expect(updatePaymentQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(updatePaymentQuery.calls).toContainEqual(["eq", ["id", "payment-1"]]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
  });

  it("records pending checkout sessions without marking the invoice paid", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({
      data: {
        ...payment,
        status: "pending",
        paid_at: null,
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never);

    const response = await POST(
      request(
        checkoutCompletedEvent({
          amount_total: 12500,
          payment_status: "processing",
        }),
      ),
    );
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
          provider_payment_id: "cs_123",
          status: "pending",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
  });

  it("does not mark the invoice paid for partial checkout payments", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({
      data: {
        ...payment,
        amount_cents: 5000,
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never);

    const response = await POST(
      request(
        checkoutCompletedEvent({
          amount_total: 5000,
          payment_status: "paid",
        }),
      ),
    );
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
          amount_cents: 5000,
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
  });

  it("does not mark the invoice paid when the currency does not match", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_123" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({
      data: {
        ...payment,
        currency: "eur",
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never);

    const response = await POST(
      request(
        checkoutCompletedEvent({
          currency: "eur",
          payment_status: "paid",
        }),
      ),
    );
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
          currency: "eur",
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
  });

  it("records async payment failures without marking the invoice paid", async () => {
    const invoiceQuery = new MockQuery({ data: invoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_125" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({
      data: {
        ...payment,
        status: "failed",
        paid_at: null,
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never);

    const response = await POST(request(checkoutAsyncFailedEvent()));
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
          provider_payment_id: "cs_123",
          status: "failed",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
  });

  it("does not mark a void invoice paid from Stripe webhook events", async () => {
    const invoiceQuery = new MockQuery({ data: voidInvoice, error: null });
    const dedupeQuery = new MockQuery({ data: { event_id: "evt_124" }, error: null });
    const existingPaymentQuery = new MockQuery({
      data: null,
      error: { code: "PGRST116" },
    });
    const insertPaymentQuery = new MockQuery({ data: payment, error: null });
    serviceClient.from
      .mockReturnValueOnce(invoiceQuery as never)
      .mockReturnValueOnce(dedupeQuery as never)
      .mockReturnValueOnce(existingPaymentQuery as never)
      .mockReturnValueOnce(insertPaymentQuery as never);

    const response = await POST(request(checkoutAsyncSucceededEvent()));
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
          provider_payment_id: "cs_123",
          status: "succeeded",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledTimes(4);
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
      new MockQuery({ data: null, error: { code: "PGRST116" } }) as never,
    );

    const response = await POST(request(checkoutAsyncSucceededEvent()));
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
