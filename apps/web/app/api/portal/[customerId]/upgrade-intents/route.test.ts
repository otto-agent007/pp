import { createGeneratedNotificationEventRecord } from "@pest-patrol/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { __setTestRateLimitChecker } from "../../../_lib/rate-limit";

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

function request(
  body: Record<string, unknown>,
  sessionToken?: string,
  init: { origin?: string | null; referer?: string | null } = {
    origin: "http://localhost",
  },
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (init.origin !== null) {
    headers.Origin = init.origin ?? "http://localhost";
  }

  if (init.referer) {
    headers.Referer = init.referer;
  }

  if (sessionToken) {
    headers.Cookie = `pp_customer_portal_session=${sessionToken}`;
  }

  return new Request(
    "http://localhost/api/portal/customer-1/upgrade-intents",
    {
      body: JSON.stringify(body),
      headers,
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
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
    vi.mocked(createGeneratedNotificationEventRecord).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects query-token access without a portal session cookie", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/portal/customer-1/upgrade-intents?access_token=legacy-token",
        {
          body: JSON.stringify({ plan_id: "general_pest_recurring" }),
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost",
          },
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal session is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects cross-origin portal upgrade intent posts before session validation", async () => {
    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session", {
        origin: "https://evil.example",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(403);
    expect(bodyText).toContain("Request origin is not allowed");
    expect(bodyText).not.toContain("valid-session");
    expect(bodyText).not.toContain("evil.example");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(createGeneratedNotificationEventRecord).not.toHaveBeenCalled();
  });

  it("rejects missing-origin portal upgrade intent posts explicitly", async () => {
    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session", {
        origin: null,
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Request origin is not allowed");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(createGeneratedNotificationEventRecord).not.toHaveBeenCalled();
  });

  it("allows same-origin Referer fallback when Origin is missing", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: "2099-06-01T18:12:00.000Z",
            id: "session-1",
            revoked_at: null,
            token_id: "token-1",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));
    vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValue({
      id: "notification-1",
    } as never);

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session", {
        origin: null,
        referer: "http://localhost/portal/customer-1",
      }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );

    expect(response.status).toBe(200);
  });

  it("requires a portal session cookie", async () => {
    const response = await POST(
      request({ plan_id: "general_pest_recurring" }),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal session is required");
  });

  it("returns 429 before portal-session validation and notification creation", async () => {
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: true,
      }),
    );

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session"),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests. Please retry later.");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(
      vi.mocked(createGeneratedNotificationEventRecord).mock.calls.length,
    ).toBe(0);
  });

  it("rejects invalid portal sessions", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: null, error: null }),
    );

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "bad-session"),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("rejects expired portal sessions", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({
        data: {
          customer_id: "customer-1",
          expires_at: "2026-06-01T18:12:00.000Z",
          id: "session-1",
          revoked_at: null,
          token_id: "token-1",
        },
        error: null,
      }),
    );

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "expired-session"),
      {
        params: Promise.resolve({ customerId: "customer-1" }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("creates one sanitized pending notification for valid portal sessions", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: "2099-06-01T18:12:00.000Z",
            id: "session-1",
            revoked_at: null,
            token_id: "token-1",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));
    vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValue({
      id: "notification-1",
    } as never);

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session"),
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
      title: "Recurring service review request",
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
            expires_at: "2099-06-01T18:12:00.000Z",
            id: "session-1",
            revoked_at: null,
            token_id: "token-1",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));
    vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValue(null);

    const response = await POST(
      request({ plan_id: "general_pest_recurring" }, "valid-session"),
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
