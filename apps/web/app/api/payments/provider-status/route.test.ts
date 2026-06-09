import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

let adminError: Response | null = null;

vi.mock("../../_lib/server-auth", () => ({
  getAdminAccess: () =>
    Promise.resolve(
      adminError
        ? { access: null, response: adminError }
        : { access: { userId: "admin-user" }, response: null },
    ),
}));

function request() {
  return new Request("http://localhost/api/payments/provider-status");
}

describe("payment provider status route", () => {
  beforeEach(() => {
    adminError = null;
    vi.unstubAllEnvs();
  });

  it("requires admin authentication", async () => {
    adminError = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await GET(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
  });

  it("reports live-mode blocked without leaking key values", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_secret-value");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_secret-value");

    const response = await GET(request());
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      live_mode_approved: false,
      manual_fallback: true,
      provider: "stripe",
      readiness_state: "live_mode_blocked",
      secret_configured: true,
      stripe_key_mode: "live",
      webhook_secret_configured: true,
    });
    expect(serialized).not.toContain("sk_live_secret-value");
    expect(serialized).not.toContain("whsec_secret-value");
  });
});
