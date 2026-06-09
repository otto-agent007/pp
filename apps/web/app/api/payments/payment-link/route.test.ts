import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: vi.fn(),
}));

import { __setTestRateLimitChecker } from "../../_lib/rate-limit";
import { getAdminAccess } from "../../_lib/server-auth";
import { POST } from "./route";

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
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
}

const now = "2026-05-06T00:00:00.000Z";
const invoice = {
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
  job: {
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
  },
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
  payments: [],
} as const;

function request(body: unknown) {
  return new Request("http://localhost/api/payments/payment-link", {
    body: JSON.stringify(body),
    headers: {
      authorization: "Bearer admin-token",
    },
    method: "POST",
  });
}

describe("payment link route auth", () => {
  beforeEach(() => {
    serviceClient = {
      from: vi.fn(),
    };
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: {
        profile: {
          id: "admin-1",
          role: "admin",
          email: "admin@example.com",
          display_name: "Admin",
          status: "active",
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
        userId: "admin-1",
      },
      response: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(getAdminAccess).mockReset();
  });

  it("rejects unauthenticated payment link creation", async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: null,
      response: NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    });

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("returns a sanitized provider-unavailable response when Stripe is not configured", async () => {
    const fetch = vi.fn();
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubGlobal("fetch", fetch);

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      error?: string;
      manual_fallback?: boolean;
      provider?: string;
    };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      error: "Stripe payment links are unavailable",
      manual_fallback: true,
      provider: "stripe",
    });
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(serialized).not.toContain("STRIPE_SECRET_KEY");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("sk_live");
  });

  it("returns 429 before calling Stripe when the rate limit is reached", async () => {
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: true,
      }),
    );
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      error?: string;
    };

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests. Please retry later.");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("sk_test_123");
  });

  it("blocks live Stripe keys before provider or database calls without approval", async () => {
    const fetch = vi.fn();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "false");
    vi.stubGlobal("fetch", fetch);

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      error?: string;
      manual_fallback?: boolean;
      provider?: string;
    };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      error: "Stripe live mode is not approved",
      manual_fallback: true,
      provider: "stripe",
    });
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(serialized).not.toContain("sk_live_123");
  });

  it("blocks unknown Stripe key formats before provider calls", async () => {
    const fetch = vi.fn();
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_unknown");
    vi.stubGlobal("fetch", fetch);

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      error?: string;
      manual_fallback?: boolean;
      provider?: string;
    };

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      error: "Stripe payment links are unavailable",
      manual_fallback: true,
      provider: "stripe",
    });
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reuses an existing Stripe payment link without calling Stripe again", async () => {
    const fetch = vi.fn();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubGlobal("fetch", fetch);
    serviceClient.from.mockReturnValue(
      new MockQuery({
        data: {
          ...invoice,
          payment_url: "https://pay.stripe.com/reused",
          stripe_payment_link_id: "plink_reused",
        },
        error: null,
      }) as never,
    );

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      payment_url?: string;
      provider?: string;
      provider_payment_link_id?: string;
      reused?: boolean;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      provider: "stripe",
      provider_payment_link_id: "plink_reused",
      payment_url: "https://pay.stripe.com/reused",
      reused: true,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds a payment link from canonical invoice data", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: "plink_123",
        url: "https://pay.stripe.com/test",
      }),
      ok: true,
    });
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubGlobal("fetch", fetch);
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: invoice, error: null }) as never,
    );

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      payment_url?: string;
      provider?: string;
      provider_payment_link_id?: string;
    };
    const fetchOptions = fetch.mock.calls[0]?.[1] as {
      body?: URLSearchParams;
      headers?: Record<string, string>;
      method?: string;
    };
    const requestBody = fetchOptions.body as URLSearchParams;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      provider: "stripe",
      provider_payment_link_id: "plink_123",
      payment_url: "https://pay.stripe.com/test",
    });
    expect(serviceClient.from).toHaveBeenCalledWith("invoices");
    expect(requestBody.get("line_items[0][price_data][product_data][name]")).toBe(
      "Quarterly service",
    );
    expect(
      requestBody.get("line_items[0][price_data][product_data][description]"),
    ).toBe("Invoice invoice-1");
    expect(requestBody.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(requestBody.get("line_items[0][price_data][unit_amount]")).toBe(
      "12500",
    );
    expect(requestBody.get("line_items[0][quantity]")).toBe("1");
    expect(requestBody.get("metadata[invoice_id]")).toBe("invoice-1");
    expect(requestBody.get("metadata[job_id]")).toBe("job-1");
    expect(requestBody.get("metadata[customer_id]")).toBe("customer-1");
    expect(requestBody.get("payment_intent_data[metadata][invoice_id]")).toBe(
      "invoice-1",
    );
    expect(requestBody.get("payment_intent_data[metadata][job_id]")).toBe(
      "job-1",
    );
    expect(
      requestBody.get("payment_intent_data[metadata][customer_id]"),
    ).toBe("customer-1");
    expect(requestBody.get("metadata[customer_name]")).toBeNull();
    expect(requestBody.get("metadata[customer_email]")).toBeNull();
    expect(requestBody.get("metadata[customer_phone]")).toBeNull();
    expect(requestBody.get("metadata[address]")).toBeNull();
    expect(
      requestBody.get("payment_intent_data[metadata][customer_name]"),
    ).toBeNull();
    expect(
      requestBody.get("payment_intent_data[metadata][customer_email]"),
    ).toBeNull();
    expect(
      requestBody.get("payment_intent_data[metadata][customer_phone]"),
    ).toBeNull();
    expect(
      requestBody.get("payment_intent_data[metadata][address]"),
    ).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/payment_links",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk_test_123",
          "Idempotency-Key": "stripe-payment-link:invoice-1",
        }),
      }),
    );
  });

  it("ignores client-supplied invoice fields and provider metadata", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: "plink_123",
        url: "https://pay.stripe.com/test",
      }),
      ok: true,
    });
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubGlobal("fetch", fetch);
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: invoice, error: null }) as never,
    );

    const response = await POST(
      request({
        invoice: {
          id: "attacker-invoice",
          customer_id: "attacker-customer",
          job_id: "attacker-job",
          line_items: [
            {
              description: "Attacker supplied item",
              invoice_id: "attacker-invoice",
              quantity: 99,
              unit_amount_cents: 1,
            },
          ],
          provider_payment_link_id: "plink_attacker",
          payment_url: "https://attacker.example/pay",
        },
        invoice_id: "invoice-1",
        provider_payment_id: "pi_attacker",
      }),
    );
    const fetchOptions = fetch.mock.calls[0]?.[1] as {
      body?: URLSearchParams;
    };
    const requestBody = fetchOptions.body as URLSearchParams;

    expect(response.status).toBe(200);
    expect(requestBody.get("metadata[invoice_id]")).toBe("invoice-1");
    expect(requestBody.get("metadata[job_id]")).toBe("job-1");
    expect(requestBody.get("metadata[customer_id]")).toBe("customer-1");
    expect(requestBody.toString()).not.toContain("attacker");
    expect(requestBody.toString()).not.toContain("pi_attacker");
    expect(requestBody.toString()).not.toContain("plink_attacker");
  });

  it("allows live Stripe keys only when the approval flag is set", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: "plink_live",
        url: "https://pay.stripe.com/live",
      }),
      ok: true,
    });
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    vi.stubEnv("STRIPE_LIVE_MODE_APPROVED", "true");
    vi.stubGlobal("fetch", fetch);
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: invoice, error: null }) as never,
    );

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as {
      payment_url?: string;
      provider_payment_link_id?: string;
    };

    expect(response.status).toBe(200);
    expect(body.provider_payment_link_id).toBe("plink_live");
    expect(body.payment_url).toBe("https://pay.stripe.com/live");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.stripe.com/v1/payment_links",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk_live_123",
        }),
      }),
    );
  });

  it("returns a sanitized error when Stripe rejects payment link creation", async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        error: {
          message: "Stripe secret sk_test_123 should never surface",
        },
      }),
      ok: false,
      status: 402,
    });
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubGlobal("fetch", fetch);
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: invoice, error: null }) as never,
    );

    const response = await POST(request({ invoice_id: "invoice-1" }));
    const body = (await response.json()) as { error?: string };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(402);
    expect(body.error).toBe("Unable to create payment link");
    expect(serialized).not.toContain("sk_test_123");
    expect(serialized).not.toContain("Stripe secret");
  });
});
