import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
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

function exchange(grant?: string) {
  const suffix = grant ? `?grant=${grant}` : "";

  return GET(
    new Request(`http://localhost/api/portal/customer-1/sessions${suffix}`),
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

  it("rejects expired or revoked grants before creating a session", async () => {
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

    const response = await exchange("expired-grant");

    expect(response.status).toBe(403);
    expect(serviceClient.from).toHaveBeenCalledTimes(1);
  });

  it("creates a hashed session, consumes the grant, records audit, and scrubs the URL", async () => {
    const insertQuery = new MockQuery({ data: null, error: null });
    const updateQuery = new MockQuery({ data: null, error: null });
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: "2026-06-03T18:12:00.000Z",
            id: "token-1",
            status: "active",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));

    const response = await exchange("portal-token");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/portal/customer-1",
    );
    expect(response.headers.get("location")).not.toContain("grant=");
    expect(response.headers.get("set-cookie")).toContain(
      "pp_customer_portal_session=",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("set-cookie")).toContain("Secure");
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
    expect(updateQuery.calls).toContainEqual([
      "update",
      [
        expect.objectContaining({
          last_used_at: "2026-06-02T18:12:00.000Z",
          status: "revoked",
        }),
      ],
    ]);
    expect(serviceClient.from).toHaveBeenCalledWith(
      "customer_portal_access_token_events",
    );
  });
});
