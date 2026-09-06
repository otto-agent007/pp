import {
  refreshDemoLoginSeedRecords,
  type DemoSeedSupabaseClient,
} from "@pest-patrol/api-client";
import {
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_CONFIRMATION,
  buildDemoSeedPlan,
  buildDemoSeedRuntimeStatus,
  getDemoSeedPlanSummary,
  validateDemoSeedGuardrails,
} from "@pest-patrol/domain";
import type { DemoSeedTarget } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../../_lib/server-auth";

export const runtime = "nodejs";

function configuredTarget(): DemoSeedTarget {
  return process.env.VERCEL_ENV === "preview" ? "preview" : "local";
}

function responseStatusForReason(reason: string) {
  if (reason.includes("production")) {
    return 403;
  }

  return 400;
}

export async function POST(request: Request) {
  const { access, response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  if (access.profile.email !== DEMO_SEED_ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "Demo login refresh is only available for the demo account." },
      { status: 403 },
    );
  }

  const target = configuredTarget();
  const plan = buildDemoSeedPlan();
  const summary = getDemoSeedPlanSummary(plan);
  const status = buildDemoSeedRuntimeStatus({
    previewSecretConfigured: Boolean(process.env.DEMO_SEED_PREVIEW_SECRET),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    target,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!status.available) {
    return NextResponse.json(
      { error: status.reason, status, summary },
      {
        status: responseStatusForReason(
          status.reason ?? "Demo seed unavailable",
        ),
      },
    );
  }

  const guardrail = validateDemoSeedGuardrails({
    confirm: DEMO_SEED_CONFIRMATION,
    previewSecretConfigured: Boolean(process.env.DEMO_SEED_PREVIEW_SECRET),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    target,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!guardrail.ok) {
    return NextResponse.json(
      { error: guardrail.message, status, summary },
      { status: 400 },
    );
  }

  try {
    const client =
      createServiceRoleSupabaseClient() as unknown as DemoSeedSupabaseClient;
    const result = await refreshDemoLoginSeedRecords(
      client,
      plan,
      access.userId,
    );

    return NextResponse.json({
      action: "seed",
      result,
      status,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to refresh demo login data";

    return NextResponse.json(
      { error: message, status, summary },
      { status: 400 },
    );
  }
}
