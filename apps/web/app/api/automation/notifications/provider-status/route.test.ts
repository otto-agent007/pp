import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

let adminError: Response | null = null;

vi.mock("../../../_lib/server-auth", () => ({
  getAdminAccess: () =>
    Promise.resolve(
      adminError
        ? { access: null, response: adminError }
        : { access: { userId: "admin-user" }, response: null },
    ),
}));

function request() {
  return new Request(
    "http://localhost/api/automation/notifications/provider-status",
  );
}

describe("notification provider status route", () => {
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

  it("reports manual fallback without exposing provider secrets", async () => {
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_SECRET", "secret-value");

    const response = await GET(request());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      manual_fallback: true,
      provider: "manual",
      readiness_state: "manual_fallback",
      webhook_configured: false,
      webhook_secret_configured: true,
    });
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("reports webhook mode without exposing provider URL", async () => {
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.test/send");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_SECRET", "secret-value");

    const response = await GET(request());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      manual_fallback: false,
      provider: "webhook",
      readiness_state: "ready",
      webhook_configured: true,
      webhook_secret_configured: true,
    });
    expect(JSON.stringify(body)).not.toContain("provider.test");
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("reports production webhook secret gaps without exposing values", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.test/send");

    const response = await GET(request());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      manual_fallback: true,
      provider: "webhook",
      readiness_state: "misconfigured",
      webhook_configured: true,
      webhook_secret_configured: false,
    });
    expect(JSON.stringify(body)).not.toContain("provider.test");
  });
});
