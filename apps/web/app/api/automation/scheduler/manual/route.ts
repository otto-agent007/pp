import { createAutomationSchedulerRunRecord } from "@pest-patrol/api-client";
import { runAutomationSchedulerForClient } from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../../_lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess(request);

  if (adminAccess.response) {
    return adminAccess.response;
  }

  try {
    const client = createServiceRoleSupabaseClient();
    const startedAt = new Date().toISOString();
    const now = new URL(request.url).searchParams.get("now") ?? undefined;
    const result = await runAutomationSchedulerForClient(client, now);
    const run = await createAutomationSchedulerRunRecord(
      {
        status: "success",
        triggered_by: "manual",
        triggered_by_user_id: adminAccess.access.userId,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        created_count: result.created,
        skipped_duplicate_count: result.skipped_duplicates,
        evaluated_rule_count: result.evaluated_rules,
        evaluated_job_count: result.evaluated_jobs,
      },
      client,
    );

    return NextResponse.json({ result, run });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run scheduler";

    try {
      const client = createServiceRoleSupabaseClient();
      await createAutomationSchedulerRunRecord(
        {
          status: "failed",
          triggered_by: "manual",
          triggered_by_user_id: adminAccess.access.userId,
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
      // Keep the manual run response focused on the original failure.
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
