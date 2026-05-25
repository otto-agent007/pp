import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const refreshDemoLoginSeedRecords = vi.fn();
let adminError: Response | null = null;
let adminProfileEmail = "demo@email.com";
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pest-patrol/api-client")>()),
  refreshDemoLoginSeedRecords: (
    client: unknown,
    plan: unknown,
    userId: string,
  ) => refreshDemoLoginSeedRecords(client, plan, userId),
}));

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminError
        ? { access: null, response: adminError }
        : {
            access: {
              profile: { email: adminProfileEmail },
              userId: "demo-admin-user",
            },
            response: null,
          },
    ),
}));

function request() {
  return new Request("http://localhost/api/demo-seed/login-refresh", {
    headers: { authorization: "Bearer demo-token" },
    method: "POST",
  });
}

describe("demo login refresh route", () => {
  beforeEach(() => {
    adminError = null;
    adminProfileEmail = "demo@email.com";
    serviceClient = { from: vi.fn() };
    refreshDemoLoginSeedRecords.mockReset();
    refreshDemoLoginSeedRecords.mockResolvedValue({
      reset: { adminUsers: 0, customers: 100, jobs: 180 },
      seed: { adminUsers: 1, customers: 100, jobs: 180 },
    });
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  });

  it("requires admin authentication before touching the service role client", async () => {
    adminError = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(refreshDemoLoginSeedRecords).not.toHaveBeenCalled();
  });

  it("refuses non-demo admins before touching demo records", async () => {
    adminProfileEmail = "admin@example.com";

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      "Demo login refresh is only available for the demo account.",
    );
    expect(refreshDemoLoginSeedRecords).not.toHaveBeenCalled();
  });

  it("refuses production deployments before touching demo records", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Demo seed is disabled on production deployments.");
    expect(refreshDemoLoginSeedRecords).not.toHaveBeenCalled();
  });

  it("refreshes demo data while preserving the signed-in demo admin", async () => {
    const response = await POST(request());
    const body = (await response.json()) as {
      result?: { seed?: { jobs?: number } };
      summary?: { customers?: number; jobs?: number; technicians?: number };
    };

    expect(response.status).toBe(200);
    expect(body.result?.seed?.jobs).toBe(180);
    expect(body.summary).toMatchObject({
      customers: 100,
      jobs: 180,
      technicians: 16,
    });
    expect(refreshDemoLoginSeedRecords).toHaveBeenCalledWith(
      serviceClient,
      expect.objectContaining({ marker: "[pest-patrol-demo-seed-v1]" }),
      "demo-admin-user",
    );
  });
});
