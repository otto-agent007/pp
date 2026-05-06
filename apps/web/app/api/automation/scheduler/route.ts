import { createAutomationSchedulerRunRecord } from "@pest-patrol/api-client";
import { runAutomationSchedulerForClient } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../_lib/server-auth";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecrets = [
    process.env.AUTOMATION_CRON_SECRET,
    process.env.CRON_SECRET,
  ].filter(Boolean);

  if (cronSecrets.length === 0) {
    return false;
  }

  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const headerToken = request.headers.get("x-automation-cron-secret");

  return cronSecrets.some(
    (secret) => bearerToken === secret || headerToken === secret,
  );
}

async function runScheduler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Automation scheduler access is required" },
      { status: 401 },
    );
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const startedAt = new Date().toISOString();
    const now = new URL(request.url).searchParams.get("now") ?? undefined;
    const result = await runAutomationSchedulerForClient(client, now);
    await createAutomationSchedulerRunRecord(
      {
        status: "success",
        triggered_by: "cron",
        triggered_by_user_id: null,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        created_count: result.created,
        skipped_duplicate_count: result.skipped_duplicates,
        evaluated_rule_count: result.evaluated_rules,
        evaluated_job_count: result.evaluated_jobs,
      },
      client,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run scheduler";

    try {
      const client = createServiceRoleSupabaseClient();
      await createAutomationSchedulerRunRecord(
        {
          status: "failed",
          triggered_by: "cron",
          triggered_by_user_id: null,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          created_count: 0,
          skipped_duplicate_count: 0,
          evaluated_rule_count: 0,
          evaluated_job_count: 0,
          error_message: message,
        },
        client,
      );
    } catch {
      // Keep the scheduler response focused on the original failure.
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runScheduler(request);
}

export async function POST(request: Request) {
  return runScheduler(request);
}
