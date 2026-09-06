import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};
let rateLimited = false;

vi.mock("../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

vi.mock("../../../_lib/rate-limit", () => ({
  checkApiRateLimit: () => Promise.resolve(rateLimited),
  getClientIpFromRequest: () => undefined,
  rateLimitResponse: () =>
    Response.json(
      { error: "Too many requests. Please retry later." },
      { status: 429 },
    ),
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

  maybeSingle() {
    this.calls.push(["maybeSingle", []]);
    return Promise.resolve(this.result);
  }

  or(...args: unknown[]) {
    this.calls.push(["or", args]);
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

function exchange(grant?: string) {
  return POST(
    new Request("http://localhost/api/portal/customer-1/sessions", {
      body: JSON.stringify({ grant }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
    { params: Promise.resolve({ customerId: "customer-1" }) },
  );
}

describe("customer portal session exchange route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T18:12:00.000Z"));
    serviceClient = {
      from: vi.fn(),
    };
    rateLimited = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a one-time grant", async () => {
    const response = await exchange();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal session is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("enforces the portal-session-exchange rate limit", async () => {
    rateLimited = true;

    const response = await exchange("portal-token");

    expect(response.status).toBe(429);
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects a grant that isn't active (already used, revoked, or expired)", async () => {
    serviceClient.from.mockReturnValue(new MockQuery({ data: null, error: null }));

    const response = await exchange("stale-grant");

    expect(response.status).toBe(403);
    expect(serviceClient.from).toHaveBeenCalledTimes(1);
  });

  it("atomically claims the grant, creates a hashed session, and records audit", async () => {
    const claimQuery = new MockQuery({
      data: {
        customer_id: "customer-1",
        expires_at: "2026-06-03T18:12:00.000Z",
        id: "token-1",
      },
      error: null,
    });
    const insertQuery = new MockQuery({ data: null, error: null });
    serviceClient.from
      .mockReturnValueOnce(claimQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));

    const response = await exchange("portal-token");
    const body = (await response.json()) as { redirectTo?: string };

    expect(response.status).toBe(200);
    expect(body.redirectTo).toBe("/portal/customer-1");
    expect(response.headers.get("set-cookie")).toContain(
      "pp_customer_portal_session=",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Secure");

    // The claim is a single conditional UPDATE (status='active' -> 'revoked'),
    // not a read followed by a separate write, so two concurrent exchanges of
    // the same grant can't both succeed.
    expect(claimQuery.calls).toContainEqual([
      "update",
      [expect.objectContaining({ status: "revoked" })],
    ]);
    expect(claimQuery.calls).toContainEqual(["eq", ["status", "active"]]);

    expect(insertQuery.calls).toContainEqual([
      "insert",
      [
        expect.objectContaining({
          customer_id: "customer-1",
          expires_at: "2026-06-03T18:12:00.000Z",
          token_id: "token-1",
        }),
      ],
    ]);
    expect(JSON.stringify(insertQuery.calls)).not.toContain("portal-token");
    expect(serviceClient.from).toHaveBeenCalledWith(
      "customer_portal_access_token_events",
    );
  });
});
