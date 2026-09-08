import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const runAutomationSchedulerForClient = vi.fn();
const createAutomationSchedulerRunRecord = vi.fn();
let adminResponse: Response | null = null;
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", () => ({
  createAutomationSchedulerRunRecord: (
    input: unknown,
    client: unknown,
  ) => createAutomationSchedulerRunRecord(input, client),
}));

vi.mock("@pest-patrol/application", () => ({
  runAutomationSchedulerForClient: (
    client: unknown,
    now: string | undefined,
  ) => runAutomationSchedulerForClient(client, now),
}));

vi.mock("../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminResponse
        ? { access: null, response: adminResponse }
        : { access: { userId: "admin-1" }, response: null },
    ),
}));

function request(now?: string) {
  const suffix = now ? `?now=${encodeURIComponent(now)}` : "";

  return new Request(
    `http://localhost/api/automation/scheduler/manual${suffix}`,
    {
      headers: { authorization: "Bearer admin-token" },
      method: "POST",
    },
  );
}

describe("manual automation scheduler route", () => {
  beforeEach(() => {
    adminResponse = null;
    serviceClient = { from: vi.fn() };
    createAutomationSchedulerRunRecord.mockReset();
    createAutomationSchedulerRunRecord.mockResolvedValue({ id: "run-1" });
    runAutomationSchedulerForClient.mockReset();
    runAutomationSchedulerForClient.mockResolvedValue({
      created: 2,
      evaluated_jobs: 3,
      evaluated_rules: 1,
      skipped_duplicates: 1,
    });
  });

  it("requires admin authentication", async () => {
    adminResponse = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(runAutomationSchedulerForClient).not.toHaveBeenCalled();
  });

  it("runs the scheduler for admins and records success", async () => {
    const response = await POST(request("2026-05-06T12:00:00.000Z"));
    const body = (await response.json()) as {
      result?: { created: number };
      run?: { id: string };
    };

    expect(response.status).toBe(200);
    expect(body.result?.created).toBe(2);
    expect(body.run?.id).toBe("run-1");
    expect(runAutomationSchedulerForClient).toHaveBeenCalledWith(
      serviceClient,
      "2026-05-06T12:00:00.000Z",
    );
    expect(createAutomationSchedulerRunRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        created_count: 2,
        skipped_duplicate_count: 1,
        status: "success",
        triggered_by: "manual",
        triggered_by_user_id: "admin-1",
      }),
      serviceClient,
    );
  });

  it("records failed manual runs", async () => {
    runAutomationSchedulerForClient.mockRejectedValue(
      new Error("Manual scheduler failed"),
    );

    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Unable to run scheduler");
    expect(createAutomationSchedulerRunRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: "Manual scheduler failed",
        status: "failed",
        triggered_by: "manual",
        triggered_by_user_id: "admin-1",
      }),
      serviceClient,
    );
  });
});
