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

  is(...args: unknown[]) {
    this.calls.push(["is", args]);
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

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }
}

function revoke(tokenId = "token-1") {
  return POST(
    new Request(`http://localhost/api/portal/access-tokens/${tokenId}/revoke`, {
      method: "POST",
    }),
    { params: Promise.resolve({ tokenId }) },
  );
}

const revokedTokenRow = {
  id: "token-1",
  customer_id: "customer-1",
  status: "revoked" as const,
  expires_at: null,
  last_used_at: null,
  created_at: "2026-05-06T00:00:00.000Z",
  updated_at: "2026-05-06T00:00:00.000Z",
};

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
    const response = await revoke();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("returns the revoked token when audit history recording fails", async () => {
    adminAccess = {
      access: { userId: "admin-1" },
      response: null,
    };
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: revokedTokenRow, error: null }))
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }))
      .mockReturnValueOnce(
        new MockQuery({
          data: null,
          error: { message: "audit table unavailable" },
        }),
      );

    const response = await revoke();
    const body = (await response.json()) as { id?: string; status?: string };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "token-1",
      status: "revoked",
    });
  });

  it("ends every live portal session tied to the revoked token", async () => {
    adminAccess = {
      access: { userId: "admin-1" },
      response: null,
    };
    const sessionRevokeQuery = new MockQuery({ data: null, error: null });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: revokedTokenRow, error: null }))
      .mockReturnValueOnce(sessionRevokeQuery)
      .mockReturnValueOnce(new MockQuery({ data: null, error: null }));

    const response = await revoke();

    expect(response.status).toBe(200);
    expect(serviceClient.from).toHaveBeenCalledWith("customer_portal_sessions");
    expect(sessionRevokeQuery.calls).toContainEqual([
      "update",
      [expect.objectContaining({ revoked_at: expect.any(String) })],
    ]);
    expect(sessionRevokeQuery.calls).toContainEqual([
      "eq",
      ["token_id", "token-1"],
    ]);
    expect(sessionRevokeQuery.calls).toContainEqual([
      "is",
      ["revoked_at", null],
    ]);
  });
});
