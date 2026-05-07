import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("auth diagnostics route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports non-secret Supabase production auth configuration", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://ddmklokkxbbxbsxyufjd.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-secret-value");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret-value");
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      environment: "production",
      supabase_anon_key_configured: true,
      supabase_project_ref: "ddmklokkxbbxbsxyufjd",
      supabase_service_role_configured: true,
      supabase_url_configured: true,
      supabase_url_host: "ddmklokkxbbxbsxyufjd.supabase.co",
    });
    expect(JSON.stringify(body)).not.toContain("anon-secret-value");
    expect(JSON.stringify(body)).not.toContain("service-role-secret-value");
  });

  it("reports missing Supabase values without throwing", async () => {
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      environment: "test",
      supabase_anon_key_configured: false,
      supabase_project_ref: null,
      supabase_service_role_configured: false,
      supabase_url_configured: false,
      supabase_url_host: null,
    });
  });
});
