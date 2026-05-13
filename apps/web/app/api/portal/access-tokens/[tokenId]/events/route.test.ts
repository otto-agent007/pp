import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};
let adminResponse: Response | null = null;

vi.mock("../../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminResponse
        ? { access: null, response: adminResponse }
        : { access: { userId: "admin-1" }, response: null },
    ),
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

describe("customer portal access token events route", () => {
  beforeEach(() => {
    serviceClient = { from: vi.fn() };
    adminResponse = null;
  });

  it("requires admin authentication", async () => {
    adminResponse = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await GET(
      new Request("http://localhost/api/portal/access-tokens/token-1/events"),
      { params: Promise.resolve({ tokenId: "token-1" }) },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("returns admin-safe event summaries", async () => {
    const eventQuery = new MockQuery({
      data: [
        {
          id: "event-1",
          token_id: "token-1",
          customer_id: "customer-1",
          kind: "send_requested",
          occurred_at: "2026-05-06T00:00:00.000Z",
          actor_profile_id: "admin-1",
          provider_payload: { portal_url: "http://localhost/portal/customer-1" },
        },
        {
          id: "event-2",
          token_id: "token-1",
          customer_id: "customer-1",
          kind: "send_failed",
          occurred_at: "2026-05-06T01:00:00.000Z",
          actor_profile_id: "admin-1",
          provider_error: "provider-detail",
        },
      ],
      error: null,
    });
    serviceClient.from.mockReturnValue(eventQuery);

    const response = await GET(
      new Request("http://localhost/api/portal/access-tokens/token-1/events"),
      { params: Promise.resolve({ tokenId: "token-1" }) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.events).toEqual([
      {
        id: "event-1",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "send_requested",
        occurred_at: "2026-05-06T00:00:00.000Z",
      },
      {
        id: "event-2",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "send_failed",
        occurred_at: "2026-05-06T01:00:00.000Z",
      },
    ]);
    expect(body.truncated_before).toBeNull();
    expect(serialized).not.toContain("admin-1");
    expect(serialized).not.toContain("provider-detail");
    expect(serialized).not.toContain("portal/customer-1");
    expect(eventQuery.calls).toContainEqual(["eq", ["token_id", "token-1"]]);
  });
});
