import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  in(...args: unknown[]) {
    this.calls.push(["in", args]);
    return this;
  }

  maybeSingle() {
    this.calls.push(["maybeSingle", []]);
    return Promise.resolve(this.result);
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
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
  due_date: "2026-05-15T00:00:00.000Z",
  notes: "Internal note",
  payment_url: "https://pay.stripe.com/test",
  stripe_payment_link_id: "plink_123",
  created_at: now,
  updated_at: now,
  job: {
    id: "job-1",
    customer_id: "customer-1",
    location_id: "location-1",
    assigned_tech_id: null,
    status: "completed",
    scheduled_start: now,
    scheduled_end: null,
    service_notes: "Interior treatment",
    created_at: now,
    updated_at: now,
    customer: {
      id: "customer-1",
      name: "Apex Homes",
    },
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
  },
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
};

function requestWithToken(token?: string) {
  const suffix = token ? `?access_token=${token}` : "";

  return new Request(`http://localhost/api/portal/customer-1/billing${suffix}`);
}

describe("customer portal billing route", () => {
  beforeEach(() => {
    serviceClient = {
      from: vi.fn(),
    };
  });

  it("requires a portal access token", async () => {
    const response = await GET(requestWithToken(), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal access token is required");
  });

  it("rejects invalid portal tokens", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: null, error: null }),
    );

    const response = await GET(requestWithToken("bad-token"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns customer-safe invoices without internal payment details", async () => {
    const invoiceQuery = new MockQuery({ data: [invoice], error: null });
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            id: "token-1",
            customer_id: "customer-1",
            expires_at: null,
            status: "active",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(invoiceQuery);

    const response = await GET(requestWithToken("valid-token"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { invoices?: unknown[] };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.invoices).toHaveLength(1);
    expect(serialized).toContain("Quarterly service");
    expect(serialized).not.toContain("provider_payment_id");
    expect(serialized).not.toContain("pi_secret");
    expect(serialized).not.toContain("Internal note");
    expect(serialized).not.toContain("Interior treatment");
    expect(invoiceQuery.calls).toContainEqual([
      "eq",
      ["customer_id", "customer-1"],
    ]);
  });
});
