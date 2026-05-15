import {
  buildDemoSmokePreflight,
  type DemoSmokePreflightResult,
} from "../packages/domain/demoSmokePreflight";

interface CliOptions {
  baseUrl?: string;
  target?: string;
  techPasswordEnv?: string;
}

function usage() {
  return [
    "Usage:",
    "  corepack pnpm demo:smoke -- --target local|preview [--base-url URL]",
    "",
    "Optional:",
    "  --tech-password-env DEMO_TECH_PASSWORD",
    "",
    "This command is read-only. It does not seed, reset, start a server,",
    "call Supabase, or print environment variable values.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    if (arg === "--target") {
      options.target = next;
      index += 1;
      continue;
    }

    if (arg === "--base-url") {
      options.baseUrl = next;
      index += 1;
      continue;
    }

    if (arg === "--tech-password-env") {
      options.techPasswordEnv = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown demo smoke argument: ${arg}\n\n${usage()}`);
  }

  if (options.target !== "local" && options.target !== "preview") {
    throw new Error(`Pass --target local or --target preview.\n\n${usage()}`);
  }

  return options;
}

function statusLabel(value: boolean) {
  return value ? "ready" : "blocked";
}

function printList(title: string, items: string[]) {
  console.log(title);

  if (items.length === 0) {
    console.log("- none");
    return;
  }

  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function printPreflight(result: DemoSmokePreflightResult) {
  console.log(`Demo smoke preflight: ${result.state.toUpperCase()}`);
  console.log(`Target: ${result.target}`);
  console.log(`Base URL: ${result.baseUrl}`);
  console.log(`Shell seed readiness: ${statusLabel(result.shellSeedReady)}`);
  console.log(`Browser smoke readiness: ${statusLabel(result.browserSmokeReady)}`);
  console.log(
    `Demo story: ${result.summary.customers} customers, ${result.summary.locations} locations, ${result.summary.technicians} technicians, ${result.summary.jobs} jobs, ${result.summary.inventory_items} inventory items, ${result.summary.invoices} invoices.`,
  );
  console.log("");
  printList("Missing env names:", result.missingEnvNames);
  console.log("");
  printList("Blockers:", result.blockers);
  console.log("");
  printList(
    "Next safe commands:",
    result.commands.map((command) => `${command.label}: ${command.command}`),
  );
  console.log("");
  printList("Sanitized evidence prompts:", result.evidencePrompts);
}

function envSnapshot() {
  return {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = buildDemoSmokePreflight({
    baseUrl: options.baseUrl,
    env: envSnapshot(),
    target: options.target!,
    techPasswordEnv: options.techPasswordEnv,
  });

  printPreflight(result);

  if (!result.ready) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Demo smoke failed";
  console.error(message);
  process.exitCode = 1;
}
