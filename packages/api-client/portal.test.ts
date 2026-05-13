import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCustomerPortalAccessTokenRecord,
  listCustomerPortalAccessTokenEventRecords,
  listCustomerPortalAccessTokenRecords,
  listCustomerPortalBillingRecords,
  listCustomerPortalCloseoutRecords,
  revokeCustomerPortalAccessTokenRecord,
  sendCustomerPortalAccessTokenRecord,
} from "./portal";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe("portal api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
  });

  it("loads customer portal closeouts through the server access boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ closeouts: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const closeouts = await listCustomerPortalCloseoutRecords(
      "customer-1",
      "portal-token",
    );

    expect(closeouts).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/customer-1/closeouts?access_token=portal-token",
    );
  });

  it("surfaces invalid portal access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    await expect(
      listCustomerPortalCloseoutRecords("customer-1", "bad-token"),
    ).rejects.toThrow("Portal access is invalid or expired");
  });

  it("loads customer portal billing through the server access boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ invoices: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const invoices = await listCustomerPortalBillingRecords(
      "customer-1",
      "portal-token",
    );

    expect(invoices).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/customer-1/billing?access_token=portal-token",
    );
  });

  it("creates portal access tokens through an admin-authenticated route", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        customer_id: "customer-1",
        access_token: "portal-token",
        expires_at: null,
        token_id: "token-1",
        portal_url:
          "http://localhost:3000/portal/customer-1?access_token=portal-token",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const grant = await createCustomerPortalAccessTokenRecord({
      customer_id: "customer-1",
    });

    expect(grant.access_token).toBe("portal-token");
    expect(grant.token_id).toBe("token-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/access-tokens",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("sends a freshly generated portal link through the server route", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        provider: "webhook",
        status: "requested",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendCustomerPortalAccessTokenRecord({
      customer_id: "customer-1",
      token_id: "token-1",
      portal_url:
        "http://localhost:3000/portal/customer-1?access_token=portal-token",
    });

    expect(result.status).toBe("requested");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/access-tokens/send",
      expect.objectContaining({
        body: JSON.stringify({
          customer_id: "customer-1",
          token_id: "token-1",
          portal_url:
            "http://localhost:3000/portal/customer-1?access_token=portal-token",
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("lists portal access token summaries for admins", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        tokens: [
          {
            id: "token-1",
            customer_id: "customer-1",
            status: "active",
            expires_at: null,
            last_used_at: null,
            created_at: "2026-05-06T00:00:00.000Z",
            updated_at: "2026-05-06T00:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await listCustomerPortalAccessTokenRecords("customer-1");

    expect(tokens).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/access-tokens?customer_id=customer-1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
  });

  it("revokes portal access tokens for admins", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        id: "token-1",
        customer_id: "customer-1",
        status: "revoked",
        expires_at: null,
        last_used_at: null,
        created_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const token = await revokeCustomerPortalAccessTokenRecord("token-1");

    expect(token.status).toBe("revoked");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/access-tokens/token-1/revoke",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
        method: "POST",
      }),
    );
  });

  it("lists portal access token audit events for admins", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "admin-token" } },
      error: null,
    } as never);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        events: [
          {
            id: "event-1",
            token_id: "token-1",
            customer_id: "customer-1",
            kind: "generated",
            occurred_at: "2026-05-06T00:00:00.000Z",
          },
        ],
        truncated_before: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const history =
      await listCustomerPortalAccessTokenEventRecords("token-1");

    expect(history.events).toHaveLength(1);
    expect(history.events[0]?.kind).toBe("generated");
    expect(history.truncated_before).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/portal/access-tokens/token-1/events",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token",
        }),
      }),
    );
  });
});
