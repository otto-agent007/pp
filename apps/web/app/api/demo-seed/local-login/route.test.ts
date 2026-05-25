import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const replaceDemoSeedRecords = vi.fn();
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pest-patrol/api-client")>()),
  replaceDemoSeedRecords: (client: unknown, plan: unknown) =>
    replaceDemoSeedRecords(client, plan),
}));

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

function request(url = "http://localhost/api/demo-seed/local-login") {
  return new Request(url, { method: "POST" });
}

describe("local demo login seed route", () => {
  beforeEach(() => {
    serviceClient = { from: vi.fn() };
    replaceDemoSeedRecords.mockReset();
    replaceDemoSeedRecords.mockResolvedValue({
      reset: { customers: 18, jobs: 30 },
      seed: { adminUsers: 1, customers: 18, jobs: 30 },
    });
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  });

  it("prepares the local demo story without admin authentication", async () => {
    const response = await POST(request());
    const body = (await response.json()) as {
      action?: string;
      result?: { seed?: { adminUsers?: number } };
    };

    expect(response.status).toBe(200);
    expect(body.action).toBe("seed");
    expect(body.result?.seed?.adminUsers).toBe(1);
    expect(replaceDemoSeedRecords).toHaveBeenCalledWith(
      serviceClient,
      expect.objectContaining({ marker: "[pest-patrol-demo-seed-v1]" }),
    );
  });

  it("refuses non-localhost requests before touching Supabase", async () => {
    const response = await POST(
      request("https://preview.example.com/api/demo-seed/local-login"),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Local demo login is only available on localhost.");
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
  });

  it("refuses production environments before touching Supabase", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      "Local demo login is disabled outside local development.",
    );
    expect(replaceDemoSeedRecords).not.toHaveBeenCalled();
  });
});
