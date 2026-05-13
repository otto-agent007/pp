import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

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

vi.mock("../../../../_lib/server-auth", () => ({
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

  select() {
    return this;
  }

  single() {
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }

  update() {
    return this;
  }
}

describe("customer portal access token revoke route", () => {
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

  it("requires admin authentication", async () => {
    const response = await POST(
      new Request("http://localhost/api/portal/access-tokens/token-1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ tokenId: "token-1" }) },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("returns the revoked token when audit history recording fails", async () => {
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
            status: "revoked",
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
      new Request("http://localhost/api/portal/access-tokens/token-1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ tokenId: "token-1" }) },
    );
    const body = (await response.json()) as { id?: string; status?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "token-1",
      status: "revoked",
    });
  });
});
