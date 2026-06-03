import { createGeneratedNotificationEventRecord } from "@pest-patrol/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

vi.mock("@pest-patrol/api-client", () => ({
  createGeneratedNotificationEventRecord: vi.fn(),
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  maybeSingle() {
    this.calls.push(["maybeSingle", []]);
    return Promise.resolve(this.result);
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

function request(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/portal/customer-1/upgrade-intents",
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

describe("customer portal upgrade intent route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T18:12:00.000Z"));
    serviceClient = {
      from: vi.fn(),
    };
    vi.mocked(createGeneratedNotificationEventRecord).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a portal access token", async () => {
    const response = await POST(
      request({ plan_id: "general_pest_recurring" }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal access token is required");
  });

  it("rejects invalid portal tokens", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: null, error: null }),
    );

    const response = await POST(
      request({
        access_token: "bad-token",
        plan_id: "general_pest_recurring",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("rejects expired portal tokens", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({
        data: {
          customer_id: "customer-1",
          expires_at: "2026-06-01T18:12:00.000Z",
          id: "token-1",
          status: "active",
        },
        error: null,
      }),
    );

    const response = await POST(
      request({
        access_token: "expired-token",
        plan_id: "general_pest_recurring",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("creates one sanitized pending notification for valid portal tokens", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: null,
            id: "token-1",
            status: "active",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));
    vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValue({
      id: "notification-1",
    } as never);

    const response = await POST(
      request({
        access_token: "valid-token",
        plan_id: "general_pest_recurring",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as Record<string, unknown>;
    const call = vi.mocked(createGeneratedNotificationEventRecord).mock
      .calls[0];

    expect(response.status).toBe(200);
    expect(body).toEqual({
      notification_id: "notification-1",
      plan_id: "general_pest_recurring",
      status: "requested",
    });
    expect(call?.[0]).toMatchObject({
      customer_id: "customer-1",
      due_at: "2026-06-02T18:12:00.000Z",
      generated_key: "portal-upgrade:customer-1:general-pest:2026-06-02",
      job_id: null,
      rule_id: null,
      title: "General Pest recurring service request",
      type: "recurring_service_prompt",
    });
    expect(call?.[1]).toBe(serviceClient);
    expect(JSON.stringify(call?.[0])).not.toContain("access_token");
    expect(JSON.stringify(call?.[0])).not.toContain("provider_payment_id");
    expect(JSON.stringify(call?.[0])).not.toContain("stripe");
  });

  it("returns already_requested for duplicate same-day generated keys", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: null,
            id: "token-1",
            status: "active",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));
    vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValue(null);

    const response = await POST(
      request({
        access_token: "valid-token",
        plan_id: "general_pest_recurring",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      notification_id: null,
      plan_id: "general_pest_recurring",
      status: "already_requested",
    });
  });
});
