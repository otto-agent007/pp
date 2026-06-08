import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
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

function requestWithSession(sessionToken?: string) {
  const headers = sessionToken
    ? { Cookie: `pp_customer_portal_session=${sessionToken}` }
    : undefined;

  return new Request("http://localhost/api/portal/customer-1/closeouts", {
    headers,
  });
}

describe("customer portal closeouts route", () => {
  beforeEach(() => {
    serviceClient = {
      from: vi.fn(),
      storage: { from: vi.fn() },
    };
  });

  it("rejects query-token access without a portal session cookie", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/portal/customer-1/closeouts?access_token=legacy-token",
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

  it("requires a portal session cookie", async () => {
    const response = await GET(requestWithSession(), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal session is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects wrong-customer or unknown portal sessions", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: null, error: null }),
    );

    const response = await GET(requestWithSession("wrong-customer-session"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Portal access is invalid or expired");
  });

  it("rejects expired portal sessions", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({
        data: {
          customer_id: "customer-1",
          id: "session-1",
          expires_at: "2026-05-01T00:00:00.000Z",
          revoked_at: null,
          token_id: "token-1",
        },
        error: null,
      }),
    );

    const response = await GET(requestWithSession("expired-session"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Portal access is invalid or expired");
  });

  it("returns customer-safe closeouts for valid portal sessions", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: "2099-05-01T00:00:00.000Z",
            id: "session-1",
            revoked_at: null,
            token_id: "token-1",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }));

    const response = await GET(requestWithSession("valid-session"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { closeouts?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.closeouts).toEqual([]);
    expect(serviceClient.from).toHaveBeenCalledWith(
      "customer_portal_sessions",
    );
  });

  it("does not serialize exact GPS evidence or map links in portal closeouts", async () => {
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            customer_id: "customer-1",
            expires_at: "2099-05-01T00:00:00.000Z",
            id: "session-1",
            revoked_at: null,
            token_id: "token-1",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(
        new MockQuery({
          data: [
            {
              id: "job-1",
              customer_id: "customer-1",
              location_id: "location-1",
              status: "completed",
              scheduled_start: "2026-05-06T09:00:00Z",
              scheduled_end: null,
              customer: { id: "customer-1", name: "Apex Homes" },
              location: {
                id: "location-1",
                address: "10 Pine Street",
                nickname: "Main house",
              },
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }));

    const response = await GET(requestWithSession("valid-session"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
    expect(serialized).not.toContain("map_url");
    expect(serialized).not.toContain("33.8121");
    expect(serialized).not.toContain("-117.919");
  });
});
