import {
  replaceDemoSeedRecords,
  type DemoSeedSupabaseClient,
} from "@pest-patrol/api-client";
import {
  DEMO_SEED_CONFIRMATION,
  buildDemoSeedPlan,
  buildDemoSeedRuntimeStatus,
  getDemoSeedPlanSummary,
  validateDemoSeedGuardrails,
} from "@pest-patrol/domain";
import { NextResponse } from "next/server";

import { createServiceRoleSupabaseClient } from "../../_lib/server-auth";

export const runtime = "nodejs";

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalDevelopment() {
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL_ENV;
}

export async function POST(request: Request) {
  const plan = buildDemoSeedPlan();
  const summary = getDemoSeedPlanSummary(plan);

  try {
    const hostname = new URL(request.url).hostname;

    if (!isLocalhost(hostname)) {
      return NextResponse.json(
        { error: "Local demo login is only available on localhost." },
        { status: 403 },
      );
    }

    if (!isLocalDevelopment()) {
      return NextResponse.json(
        { error: "Local demo login is disabled outside local development." },
        { status: 403 },
      );
    }

    const status = buildDemoSeedRuntimeStatus({
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      target: "local",
      vercelEnv: process.env.VERCEL_ENV,
    });

    if (!status.available) {
      return NextResponse.json(
        { error: status.reason, status, summary },
        { status: 400 },
      );
    }

    const guardrail = validateDemoSeedGuardrails({
      confirm: DEMO_SEED_CONFIRMATION,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      target: "local",
      vercelEnv: process.env.VERCEL_ENV,
    });

    if (!guardrail.ok) {
      return NextResponse.json(
        { error: guardrail.message, status, summary },
        { status: 400 },
      );
    }

    const client =
      createServiceRoleSupabaseClient() as unknown as DemoSeedSupabaseClient;
    const result = await replaceDemoSeedRecords(client, plan);

    return NextResponse.json({
      action: "seed",
      result,
      status,
      summary,
    });
  } catch (error) {
    console.error("Demo login preparation failed", error);

    return NextResponse.json(
      { error: "Unable to prepare demo login", summary },
      { status: 400 },
    );
  }
}
