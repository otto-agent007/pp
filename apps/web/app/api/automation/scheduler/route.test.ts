import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const runAutomationSchedulerForClient = vi.fn();
const createAutomationSchedulerRunRecord = vi.fn();
let serviceClient: { from: ReturnType<typeof vi.fn> };

vi.mock("@pest-patrol/api-client", () => ({
  // the route builds its port from this factory; capturing the client it
  // binds is what proves the service-role client still reaches the scheduler
  createAutomationAdapter: (client: unknown) => ({ boundClient: client }) as never,
  createAutomationSchedulerRunRecord: (
    input: unknown,
    client: unknown,
  ) => createAutomationSchedulerRunRecord(input, client),
}));

vi.mock("@pest-patrol/application", () => ({
  runAutomationSchedulerForClient: (
    port: unknown,
    now: string | undefined,
  ) => runAutomationSchedulerForClient(port, now),
}));

vi.mock("../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
}));

function request(
  headers: Record<string, string> = {},
  now?: string,
  method = "POST",
) {
  const suffix = now ? `?now=${encodeURIComponent(now)}` : "";

  return new Request(`http://localhost/api/automation/scheduler${suffix}`, {
    headers,
    method,
  });
}

describe("automation scheduler route", () => {
  beforeEach(() => {
    serviceClient = { from: vi.fn() };
    createAutomationSchedulerRunRecord.mockReset();
    createAutomationSchedulerRunRecord.mockResolvedValue({ id: "run-1" });
    runAutomationSchedulerForClient.mockReset();
    runAutomationSchedulerForClient.mockResolvedValue({
      created: 1,
      evaluated_jobs: 2,
      evaluated_rules: 1,
      skipped_duplicates: 1,
    });
    vi.unstubAllEnvs();
    vi.stubEnv("AUTOMATION_CRON_SECRET", "cron-secret");
  });

  it("requires the cron secret", async () => {
    const response = await POST(request());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Automation scheduler access is required");
    expect(runAutomationSchedulerForClient).not.toHaveBeenCalled();
  });

  it("runs the scheduler for authorized cron calls", async () => {
    const response = await POST(
      request(
        { authorization: "Bearer cron-secret" },
        "2026-05-06T12:00:00.000Z",
      ),
    );
    const body = (await response.json()) as { created?: number };

    expect(response.status).toBe(200);
    expect(body.created).toBe(1);
    expect(runAutomationSchedulerForClient).toHaveBeenCalledWith(
      { boundClient: serviceClient },
      "2026-05-06T12:00:00.000Z",
    );
    expect(createAutomationSchedulerRunRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        created_count: 1,
        skipped_duplicate_count: 1,
        status: "success",
        triggered_by: "cron",
        triggered_by_user_id: null,
      }),
      serviceClient,
    );
  });

  it("accepts the cron secret header", async () => {
    const response = await POST(
      request({ "x-automation-cron-secret": "cron-secret" }),
    );

    expect(response.status).toBe(200);
  });

  it("records failed scheduler runs", async () => {
    runAutomationSchedulerForClient.mockRejectedValue(
      new Error("Scheduler failed"),
    );

    const response = await POST(
      request({ authorization: "Bearer cron-secret" }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Unable to run scheduler");
    expect(createAutomationSchedulerRunRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: "Scheduler failed",
        status: "failed",
        triggered_by: "cron",
        triggered_by_user_id: null,
      }),
      serviceClient,
    );
  });

  it("runs the scheduler for Vercel Cron GET calls with CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "vercel-cron-secret");
    const response = await GET(
      request(
        { authorization: "Bearer vercel-cron-secret" },
        "2026-05-06T12:00:00.000Z",
        "GET",
      ),
    );
    const body = (await response.json()) as { created?: number };

    expect(response.status).toBe(200);
    expect(body.created).toBe(1);
    expect(runAutomationSchedulerForClient).toHaveBeenCalledWith(
      { boundClient: serviceClient },
      "2026-05-06T12:00:00.000Z",
    );
  });
});
