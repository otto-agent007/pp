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

function requestWithToken(token?: string) {
  const suffix = token ? `?access_token=${token}` : "";

  return new Request(`http://localhost/api/portal/customer-1/closeouts${suffix}`);
}

describe("customer portal closeouts route", () => {
  beforeEach(() => {
    serviceClient = {
      from: vi.fn(),
      storage: { from: vi.fn() },
    };
  });

  it("requires a portal access token", async () => {
    const response = await GET(requestWithToken(), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Portal access token is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("rejects wrong-customer or unknown portal tokens", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({ data: null, error: null }),
    );

    const response = await GET(requestWithToken("wrong-customer-token"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Portal access is invalid or expired");
  });

  it("rejects expired portal tokens", async () => {
    serviceClient.from.mockReturnValue(
      new MockQuery({
        data: {
          id: "token-1",
          customer_id: "customer-1",
          expires_at: "2026-05-01T00:00:00.000Z",
          status: "active",
        },
        error: null,
      }),
    );

    const response = await GET(requestWithToken("expired-token"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Portal access is invalid or expired");
  });

  it("returns customer-safe closeouts for valid portal tokens", async () => {
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
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }))
      .mockReturnValueOnce(new MockQuery({ data: [], error: null }));

    const response = await GET(requestWithToken("valid-token"), {
      params: Promise.resolve({ customerId: "customer-1" }),
    });
    const body = (await response.json()) as { closeouts?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.closeouts).toEqual([]);
    expect(serviceClient.from).toHaveBeenCalledWith(
      "customer_portal_access_tokens",
    );
  });
});
