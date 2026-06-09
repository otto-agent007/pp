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
  return new Request("http://localhost/api/ops/readiness");
}

describe("ops readiness route", () => {
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

  it("reports sanitized readiness without exposing secret values", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-secret");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-secret");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_secret-value");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_secret-value");
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.example/send");
    vi.stubEnv("OPENAI_API_KEY", "openai-secret");

    const response = await GET(request());
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      stripe: {
        readiness_state: "live_mode_blocked",
        stripe_key_mode: "live",
        webhook_secret_configured: true,
      },
      supabase: {
        anon_key_configured: true,
        service_role_configured: true,
        url_configured: true,
      },
    });
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("service-secret");
    expect(serialized).not.toContain("provider.example");
    expect(serialized).not.toContain("openai-secret");
  });

  it("reports portal and notification webhook secret gaps", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PORTAL_DELIVERY_WEBHOOK_URL", "https://provider.example/portal");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.example/send");

    const response = await GET(request());
    const body = (await response.json()) as {
      notification_delivery?: Record<string, unknown>;
      portal_delivery?: Record<string, unknown>;
    };

    expect(response.status).toBe(200);
    expect(body.portal_delivery).toMatchObject({
      readiness_state: "misconfigured",
      webhook_secret_configured: false,
    });
    expect(body.notification_delivery).toMatchObject({
      readiness_state: "misconfigured",
      webhook_secret_configured: false,
    });
  });
});
