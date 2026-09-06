import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const replaceDemoSeedRecords = vi.fn();
const resetDemoSeedRecords = vi.fn();
let adminError: Response | null = null;
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pest-patrol/api-client")>()),
  replaceDemoSeedRecords: (client: unknown, plan: unknown) =>
    replaceDemoSeedRecords(client, plan),
  resetDemoSeedRecords: (client: unknown, plan: unknown) =>
    resetDemoSeedRecords(client, plan),
}));

vi.mock("../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminError
        ? { access: null, response: adminError }
        : { access: { userId: "admin-user" }, response: null },
    ),
}));

function request(body?: unknown) {
  return new Request("http://localhost/api/demo-seed", {
    body: body ? JSON.stringify(body) : undefined,
    headers: { authorization: "Bearer admin-token" },
    method: body ? "POST" : "GET",
  });
}

describe("demo seed route", () => {
  beforeEach(() => {
    adminError = null;
    serviceClient = { from: vi.fn() };
    replaceDemoSeedRecords.mockReset();
    replaceDemoSeedRecords.mockResolvedValue({
      reset: { customers: 100, jobs: 180 },
      seed: { customers: 100, jobs: 180 },
    });
    resetDemoSeedRecords.mockReset();
    resetDemoSeedRecords.mockResolvedValue({ customers: 100, jobs: 180 });
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  });

  it("requires admin authentication", async () => {
    adminError = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
  });

  it("reports dry-run status and summary without writing records", async () => {
    const response = await GET(request());
    const body = (await response.json()) as {
      status?: { available: boolean; target: string };
      summary?: { customers: number; jobs: number; technicians: number };
    };

    expect(response.status).toBe(200);
    expect(body.status).toMatchObject({ available: true, target: "local" });
    expect(body.summary).toMatchObject({
      customers: 100,
      jobs: 180,
      technicians: 16,
    });
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
    expect(resetDemoSeedRecords).not.toHaveBeenCalled();
  });

  it("refuses seed writes on production deployments", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await POST(
      request({
        action: "seed",
        confirm: "seed-demo-data",
        target: "preview",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Demo seed is disabled on production deployments.");
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
  });

  it("replaces demo data from protected preview after confirmation", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("DEMO_SEED_PREVIEW_SECRET", "preview-secret");

    const response = await POST(
      request({
        action: "seed",
        confirm: "seed-demo-data",
        target: "preview",
      }),
    );
    const body = (await response.json()) as {
      action?: string;
      result?: { seed?: { jobs: number } };
    };

    expect(response.status).toBe(200);
    expect(body.action).toBe("seed");
    expect(body.result?.seed?.jobs).toBe(180);
    expect(replaceDemoSeedRecords).toHaveBeenCalledWith(
      serviceClient,
      expect.objectContaining({ marker: "[pest-patrol-demo-seed-v1]" }),
    );
  });

  it("refuses preview seeding when DEMO_SEED_PREVIEW_SECRET is not configured", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    const response = await POST(
      request({
        action: "seed",
        confirm: "seed-demo-data",
        target: "preview",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Preview demo seed requires DEMO_SEED_PREVIEW_SECRET to be configured on this deployment.",
    );
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
  });

  it("resets demo data only after confirmation", async () => {
    const response = await POST(
      request({
        action: "reset",
        confirm: "seed-demo-data",
        target: "local",
      }),
    );
    const body = (await response.json()) as {
      action?: string;
      result?: { jobs: number };
    };

    expect(response.status).toBe(200);
    expect(body.action).toBe("reset");
    expect(body.result?.jobs).toBe(180);
    expect(resetDemoSeedRecords).toHaveBeenCalledWith(
      serviceClient,
      expect.objectContaining({ marker: "[pest-patrol-demo-seed-v1]" }),
    );
  });
});
