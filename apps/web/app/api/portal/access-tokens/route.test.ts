import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

let adminAccess:
  | {
      access: { userId: string };
      response: null;
    }
  | {
      access: null;
      response: Response;
    };
let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () => Promise.resolve(adminAccess),
}));

class MockQuery<T> {
  constructor(private result: T) {}

  eq() {
    return this;
  }

  insert() {
    return this;
  }

  order() {
    return this;
  }

  select() {
    return this;
  }

  single() {
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

describe("customer portal access token route", () => {
  beforeEach(() => {
    adminAccess = {
      access: null,
      response: Response.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    };
    serviceClient = {
      from: vi.fn(),
    };
  });

  it("requires admin authentication for listing", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/portal/access-tokens?customer_id=customer-1",
      ),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("requires admin authentication", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal/access-tokens", {
        body: JSON.stringify({ customer_id: "customer-1" }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("returns the one-time portal grant when audit history recording fails", async () => {
    adminAccess = {
      access: { userId: "admin-1" },
      response: null,
    };
    serviceClient.from
      .mockReturnValueOnce(
        new MockQuery({
          data: {
            id: "token-1",
            customer_id: "customer-1",
            status: "active",
            expires_at: null,
            last_used_at: null,
            created_at: "2026-05-06T00:00:00.000Z",
            updated_at: "2026-05-06T00:00:00.000Z",
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        new MockQuery({
          data: null,
          error: { message: "audit table unavailable" },
        }),
      );

    const response = await POST(
      new Request("http://localhost/api/portal/access-tokens", {
        body: JSON.stringify({ customer_id: "customer-1" }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as {
      portal_url?: string;
      token_id?: string;
    };

    expect(response.status).toBe(200);
    expect(body.token_id).toBe("token-1");
    expect(body.portal_url).toContain("/portal/customer-1?access_token=");
  });
});
