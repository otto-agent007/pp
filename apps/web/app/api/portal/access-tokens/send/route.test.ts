import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { __setTestRateLimitChecker } from "../../../_lib/rate-limit";

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
let eventInsertCalls: unknown[][];

vi.mock("../../../_lib/server-auth", () => ({
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

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    eventInsertCalls.push(args);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

const tokenRecord = {
  id: "token-1",
  customer_id: "customer-1",
  token_hash:
    "0ba11c8c03cc892e40cac090ac14c4db6e655ecfaff2490257fbe4c10fba19f9",
  status: "active",
  expires_at: null,
  customer: {
    id: "customer-1",
    name: "Apex Homes",
    email: "owner@apex.example",
    phone: "555-0100",
  },
};

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/portal/access-tokens/send", {
    body: JSON.stringify(body),
    method: "POST",
  });
}

function sendBody(overrides: Record<string, unknown> = {}) {
  return {
    customer_id: "customer-1",
    token_id: "token-1",
    portal_url: "http://localhost/portal/customer-1?grant=portal-token",
    ...overrides,
  };
}

describe("customer portal send route", () => {
  beforeEach(() => {
    adminAccess = {
      access: { userId: "admin-1" },
      response: null,
    };
    serviceClient = {
      from: vi.fn(() => new MockQuery({ error: null })),
    };
    eventInsertCalls = [];
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires admin authentication", async () => {
    adminAccess = {
      access: null,
      response: Response.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    };

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("returns 429 before provider and persistence calls when rate limited", async () => {
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: true,
      }),
    );
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(new MockQuery({ data: tokenRecord, error: null }));

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests. Please retry later.");
    expect(serviceClient.from).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain("portal-token");
  });

  it("requires a configured portal delivery webhook", async () => {
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Portal delivery provider is not configured");
    expect(JSON.stringify(body)).not.toContain("portal-token");
    expect(serviceClient.from).not.toHaveBeenCalledWith(
      "customer_portal_access_token_events",
    );
    expect(eventInsertCalls).toHaveLength(0);
  });

  it("rejects portal URLs that do not match the customer portal route", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(
      request(
        sendBody({
          portal_url:
            "http://localhost/portal/customer-2?grant=portal-token",
        }),
      ),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Portal URL does not match this customer");
  });

  it("rejects malformed portal URLs as request errors", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(
      request(
        sendBody({
          portal_url: "not a portal url",
        }),
      ),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Portal URL is invalid");
  });

  it("rejects token/customer mismatches and revoked tokens", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({
        data: { ...tokenRecord, customer_id: "customer-2" },
        error: null,
      }),
    );

    const mismatch = await POST(request(sendBody()));
    expect(mismatch.status).toBe(404);

    serviceClient.from.mockReturnValueOnce(
      new MockQuery({
        data: { ...tokenRecord, status: "revoked" },
        error: null,
      }),
    );

    const revoked = await POST(request(sendBody()));
    const body = (await revoked.json()) as { error?: string };
    expect(revoked.status).toBe(400);
    expect(body.error).toBe("Only active portal links can be sent");
  });

  it("rejects portal URLs whose raw access token does not match the stored hash", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(
      request(
        sendBody({
          portal_url:
            "http://localhost/portal/customer-1?grant=wrong-token",
        }),
      ),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Portal URL does not match this link");
  });

  it("requires customer contact before sending", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({
        data: {
          ...tokenRecord,
          customer: {
            ...tokenRecord.customer,
            email: null,
            phone: null,
          },
        },
        error: null,
      }),
    );

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Customer contact is required before sending portal access",
    );
  });

  it("sends a sanitized portal payload with the server-only secret", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_SECRET", "provider-secret");
    const fetchMock = vi.fn().mockImplementation(() => {
      expect(eventInsertCalls).toHaveLength(0);

      return Promise.resolve({
        json: vi.fn().mockResolvedValue({ message_id: "provider-message-1" }),
        ok: true,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as {
      provider?: string;
      status?: string;
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      provider: "webhook",
      status: "requested",
    });
    expect(JSON.stringify(body)).not.toContain("provider-message-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.example/portal",
      expect.objectContaining({
        body: JSON.stringify({
          portal_access: {
            customer_id: "customer-1",
            portal_url: "http://localhost/portal/customer-1?grant=portal-token",
            token_id: "token-1",
          },
          customer: {
            id: "customer-1",
            name: "Apex Homes",
            email: "owner@apex.example",
            phone: "555-0100",
          },
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer provider-secret",
        }),
        method: "POST",
      }),
    );
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain(
      "0ba11c8c03cc892e40cac090ac14c4db6e655ecfaff2490257fbe4c10fba19f9",
    );
    expect(serviceClient.from).toHaveBeenCalledWith(
      "customer_portal_access_token_events",
    );
    expect(eventInsertCalls).toEqual([
      [
        {
          actor_profile_id: "admin-1",
          customer_id: "customer-1",
          kind: "send_succeeded",
          token_id: "token-1",
        },
      ],
    ]);
  });

  it("returns provider failures without exposing provider internals", async () => {
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ secret_debug: "provider-detail" }),
        ok: false,
      }),
    );
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({ data: tokenRecord, error: null }),
    );

    const response = await POST(request(sendBody()));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toBe("Portal delivery provider request failed");
    expect(JSON.stringify(body)).not.toContain("provider-detail");
    expect(eventInsertCalls).toEqual([
      [
        {
          actor_profile_id: "admin-1",
          customer_id: "customer-1",
          kind: "send_failed",
          token_id: "token-1",
        },
      ],
    ]);
  });
});
