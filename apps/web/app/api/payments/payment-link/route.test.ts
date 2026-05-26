import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../_lib/server-auth", () => ({
  getAdminAccess: vi.fn(),
}));

import { POST } from "./route";
import { getAdminAccess } from "../../_lib/server-auth";

describe("payment link route auth", () => {
  beforeEach(() => {
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: {
        profile: {
          id: "admin-1",
          role: "admin",
          email: "admin@example.com",
          display_name: "Admin",
          status: "active",
          created_at: "2026-05-26T00:00:00.000Z",
          updated_at: "2026-05-26T00:00:00.000Z",
        },
        userId: "admin-1",
      },
      response: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.mocked(getAdminAccess).mockReset();
  });

  it("rejects unauthenticated payment link creation", async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({
      access: null,
      response: NextResponse.json(
        { error: "Authentication is required" },
        { status: 401 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/payments/payment-link", {
        body: JSON.stringify({ invoice: null }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("keeps manual payment fallback safe when Stripe is not configured", async () => {
    const fetch = vi.fn();
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubGlobal("fetch", fetch);

    const response = await POST(
      new Request("http://localhost/api/payments/payment-link", {
        body: JSON.stringify({ invoice: null }),
        method: "POST",
      }),
    );
    const body = (await response.json()) as { error?: string };
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body.error).toBe("Stripe is not configured");
    expect(fetch).not.toHaveBeenCalled();
    expect(serialized).not.toContain("STRIPE_SECRET_KEY");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("sk_live");
  });
});
