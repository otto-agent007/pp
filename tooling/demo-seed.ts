import { createClient } from "@supabase/supabase-js";

import {
  resetDemoSeedRecords,
  replaceDemoSeedRecords,
  validateDemoSeedExecution,
  type DemoSeedSupabaseClient,
} from "../packages/api-client/demoSeed";
import {
  buildDemoSeedPlan,
  resolveDemoSeedAdminPassword,
} from "../packages/domain/demoSeedData";

interface CliOptions {
  confirm?: string;
  mode: "seed" | "reset";
  target?: string;
  techPasswordEnv?: string;
}

function usage() {
  return [
    "Usage:",
    "  corepack pnpm demo:seed -- --target local|preview --confirm seed-demo-data",
    "  corepack pnpm demo:reset -- --target local|preview --confirm seed-demo-data",
    "",
    "Optional:",
    "  --tech-password-env DEMO_TECH_PASSWORD",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const [modeArg, ...args] = argv;

  if (modeArg !== "seed" && modeArg !== "reset") {
    throw new Error(usage());
  }

  const options: CliOptions = { mode: modeArg };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--target") {
      options.target = next;
      index += 1;
      continue;
    }

    if (arg === "--confirm") {
      options.confirm = next;
      index += 1;
      continue;
    }

    if (arg === "--tech-password-env") {
      options.techPasswordEnv = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown demo seed argument: ${arg}\n\n${usage()}`);
  }

  return options;
}

function getEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const validation = validateDemoSeedExecution({} as DemoSeedSupabaseClient, {
    confirm: options.confirm,
    allowedSupabaseUrl: getEnv("DEMO_SEED_ALLOWED_SUPABASE_URL"),
    previewSecretConfigured: Boolean(getEnv("DEMO_SEED_PREVIEW_SECRET")),
    // For the CLI, holding the variable is presenting it: this runs in an
    // operator shell that already has SUPABASE_SERVICE_ROLE_KEY, so a header
    // comparison would guard nothing. The header exists to stop one admin
    // reaching the HTTP route from a browser. DEMO_SEED_ALLOWED_SUPABASE_URL
    // above is the guard that matters here -- it is what stops
    // `--target preview` writing to the production project.
    previewSecretMatches: Boolean(getEnv("DEMO_SEED_PREVIEW_SECRET")),
    serviceRoleKey,
    supabaseUrl,
    target: options.target,
    vercelEnv: process.env.VERCEL_ENV,
  });

  const client = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
    },
  }) as unknown as DemoSeedSupabaseClient;
  const technicianPassword = options.techPasswordEnv
    ? getEnv(options.techPasswordEnv)
    : undefined;
  const plan = buildDemoSeedPlan({
    adminPassword: resolveDemoSeedAdminPassword(process.env, {
      requireConfigured: validation.target === "preview",
    }),
    technicianPassword,
  });

  if (options.mode === "seed") {
    const result = await replaceDemoSeedRecords(client, plan);
    const summary = result.seed;
    console.log(
      `Demo seed complete for ${validation.target}: ${summary.adminUsers} admin, ${summary.customers} customers, ${summary.technicians} technicians, ${summary.jobs} jobs, ${summary.inventory} inventory items, ${summary.media} media items, ${summary.invoices} invoices.`,
    );
    return;
  }

  const summary = await resetDemoSeedRecords(client, plan);
  console.log(
    `Demo reset complete for ${validation.target}: ${summary.adminUsers} admin auth user, ${summary.customers} customers, ${summary.technicians} technician auth users, ${summary.jobs} jobs, ${summary.inventory} inventory items, ${summary.media} media items, ${summary.invoices} invoices targeted.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Demo seed failed";
  console.error(message);
  process.exitCode = 1;
});
