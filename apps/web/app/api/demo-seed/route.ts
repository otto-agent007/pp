import {
  replaceDemoSeedRecords,
  resetDemoSeedRecords,
  type DemoSeedSupabaseClient,
} from "@pest-patrol/api-client";
import {
  buildDemoSeedPlan,
  buildDemoSeedRuntimeStatus,
  getDemoSeedPlanSummary,
  resolveDemoSeedAdminPassword,
  validateDemoSeedGuardrails,
} from "@pest-patrol/domain";
import type { DemoSeedActionInput, DemoSeedTarget } from "@pest-patrol/types";
import { NextResponse } from "next/server";

import {
  createServiceRoleSupabaseClient,
  getAdminAccess,
} from "../_lib/server-auth";

export const runtime = "nodejs";

function configuredTarget(): DemoSeedTarget {
  return process.env.VERCEL_ENV === "preview" ? "preview" : "local";
}

function runtimeStatus(target: DemoSeedTarget) {
  return buildDemoSeedRuntimeStatus({
    previewSecretConfigured: Boolean(process.env.DEMO_SEED_PREVIEW_SECRET),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    target,
    vercelEnv: process.env.VERCEL_ENV,
  });
}

function statusResponse(target = configuredTarget()) {
  const plan = buildDemoSeedPlan();

  return {
    status: runtimeStatus(target),
    summary: getDemoSeedPlanSummary(plan),
  };
}

function validateActionInput(input: unknown): DemoSeedActionInput {
  if (!input || typeof input !== "object") {
    throw new Error("Demo seed action is required");
  }

  const record = input as Partial<DemoSeedActionInput>;

  if (
    record.action !== "dry_run" &&
    record.action !== "seed" &&
    record.action !== "reset"
  ) {
    throw new Error("Demo seed action must be dry_run, seed, or reset");
  }

  if (record.target !== "local" && record.target !== "preview") {
    throw new Error("Demo seed target must be local or preview.");
  }

  return {
    action: record.action,
    confirm: record.confirm,
    target: record.target,
  };
}

function responseStatusForReason(reason: string) {
  if (reason.includes("production")) {
    return 403;
  }

  return 400;
}

export async function GET(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  return NextResponse.json(statusResponse());
}

export async function POST(request: Request) {
  const { response: authError } = await getAdminAccess(request);

  if (authError) {
    return authError;
  }

  try {
    const input = validateActionInput(await request.json());
    // Only the seed path creates auth users, so it is the only one that needs a
    // credential; dry_run and reset must not require DEMO_SEED_ADMIN_PASSWORD.
    const plan = buildDemoSeedPlan({
      adminPassword:
        input.action === "seed" ? resolveDemoSeedAdminPassword() : undefined,
    });
    const summary = getDemoSeedPlanSummary(plan);
    const status = runtimeStatus(input.target);

    if (input.action === "dry_run") {
      return NextResponse.json({
        action: input.action,
        result: summary,
        status,
        summary,
      });
    }

    if (!status.available) {
      return NextResponse.json(
        { error: status.reason, status, summary },
        { status: responseStatusForReason(status.reason ?? "Demo seed unavailable") },
      );
    }

    const guardrail = validateDemoSeedGuardrails({
      confirm: input.confirm,
      previewSecretConfigured: Boolean(process.env.DEMO_SEED_PREVIEW_SECRET),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      target: input.target,
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
    const result =
      input.action === "seed"
        ? await replaceDemoSeedRecords(client, plan)
        : await resetDemoSeedRecords(client, plan);

    return NextResponse.json({
      action: input.action,
      result,
      status,
      summary,
    });
  } catch (error) {
    console.error("Demo seed run failed", error);

    return NextResponse.json(
      { error: "Unable to run demo seed" },
      { status: 400 },
    );
  }
}
