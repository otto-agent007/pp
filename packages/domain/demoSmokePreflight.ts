import type { DemoSeedSummary } from "@pest-patrol/types";

import {
  DEMO_SEED_CONFIRMATION,
  buildDemoSeedPlan,
  getDemoSeedPlanSummary,
  type DemoSeedTarget,
} from "./demoSeedData";
import { buildDemoWorkflowFixtures } from "./demoWorkflowFixtures";

export { DEMO_SEED_CONFIRMATION } from "./demoSeedData";

export type DemoSmokeEnvName =
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

export type DemoSmokeEnv = Partial<
  Record<DemoSmokeEnvName | "VERCEL_ENV", string>
>;

export type DemoSmokePreflightState = "blocked" | "ready";

export interface DemoSmokePreflightCommand {
  command: string;
  id: "browser" | "dev" | "preflight" | "reset" | "seed";
  label: string;
}

export interface DemoSmokePreflightInput {
  baseUrl?: string;
  env?: DemoSmokeEnv;
  target: string;
  techPasswordEnv?: string;
  vercelEnv?: string;
}

export interface DemoSmokePreflightResult {
  baseUrl: string;
  blockers: string[];
  browserSmokeReady: boolean;
  commands: DemoSmokePreflightCommand[];
  evidencePrompts: string[];
  missingEnvNames: DemoSmokeEnvName[];
  ready: boolean;
  shellSeedReady: boolean;
  state: DemoSmokePreflightState;
  summary: DemoSeedSummary;
  target: DemoSeedTarget;
}

export interface LocalFixtureSmokeRoute {
  expectedText: string[];
  id:
    | "automation"
    | "closeouts"
    | "compliance"
    | "customers"
    | "dispatch"
    | "home"
    | "inventory"
    | "jobs"
    | "payments"
    | "portal"
    | "technicians";
  label: string;
  path: string;
  redactedPath: string;
  requiresAdminSession: boolean;
}

export const localFixtureSmokeStorageKeys = [
  "pest-patrol-local-demo-session",
  "pest-patrol-demo-fixture-session",
] as const;

export const localFixtureSmokeSensitivePatterns = [
  "access_token=",
  "portal-token",
  "local-demo-access-token",
  "local-demo-refresh-token",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PORTAL_DELIVERY_WEBHOOK_SECRET",
  "NOTIFICATION_DELIVERY_WEBHOOK_SECRET",
  "sk_live_",
  "sk_test_",
  "whsec_",
] as const;

const requiredEnvNames: DemoSmokeEnvName[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function envValue(env: DemoSmokeEnv | undefined, name: DemoSmokeEnvName) {
  return env?.[name]?.trim() || undefined;
}

function productionEnv(input: DemoSmokePreflightInput) {
  return input.vercelEnv ?? input.env?.VERCEL_ENV;
}

function isLocalSupabaseUrl(supabaseUrl?: string) {
  return Boolean(
    supabaseUrl?.startsWith("http://localhost") ||
    supabaseUrl?.startsWith("http://127.0.0.1"),
  );
}

function normalizedTarget(target: string): DemoSeedTarget {
  return target === "preview" ? "preview" : "local";
}

function defaultBaseUrl(target: DemoSeedTarget) {
  return target === "preview"
    ? "<protected-preview-url>"
    : "http://localhost:3000";
}

function seedCommand(target: DemoSeedTarget, techPasswordEnv?: string) {
  const techPasswordArg = techPasswordEnv
    ? ` --tech-password-env ${techPasswordEnv}`
    : "";

  return `corepack pnpm demo:seed -- --target ${target} --confirm ${DEMO_SEED_CONFIRMATION}${techPasswordArg}`;
}

function resetCommand(target: DemoSeedTarget) {
  return `corepack pnpm demo:reset -- --target ${target} --confirm ${DEMO_SEED_CONFIRMATION}`;
}

function commandsFor(input: {
  baseUrl: string;
  target: DemoSeedTarget;
  techPasswordEnv?: string;
}): DemoSmokePreflightCommand[] {
  const preflightCommand = `corepack pnpm demo:smoke -- --target ${input.target}${
    input.baseUrl !== defaultBaseUrl(input.target)
      ? ` --base-url ${input.baseUrl}`
      : ""
  }${input.techPasswordEnv ? ` --tech-password-env ${input.techPasswordEnv}` : ""}`;

  const commands: DemoSmokePreflightCommand[] = [
    {
      command: preflightCommand,
      id: "preflight",
      label: "Re-run preflight",
    },
    {
      command: seedCommand(input.target, input.techPasswordEnv),
      id: "seed",
      label: "Seed demo story",
    },
    {
      command: resetCommand(input.target),
      id: "reset",
      label: "Reset demo data",
    },
  ];

  if (input.target === "local") {
    commands.push({
      command: "corepack pnpm --filter @pest-patrol/web dev -p 3000",
      id: "dev",
      label: "Start local web app",
    });
  }

  commands.push({
    command: `Open ${input.baseUrl} in the Codex Browser and record sanitized pass/fail evidence.`,
    id: "browser",
    label: "Browser smoke",
  });

  return commands;
}

function evidenceFor(target: DemoSeedTarget): string[] {
  if (target === "preview") {
    return [
      "Route: preview /; Action: sign in through the operator-approved access path; Result: admin shell loads.",
      "Route: preview demo workflow; Action: run customer, portal, dispatch, payments, and automation checks; Result: record sanitized pass/fail only.",
    ];
  }

  return [
    "Route: local /; Action: click Log in as demo; Result: admin shell loads with the seeded story.",
    "Route: local demo workflow; Action: walk customers, portal, dispatch, payments, and automation; Result: record sanitized pass/fail only.",
  ];
}

export function buildLocalFixtureSmokePlan(): LocalFixtureSmokeRoute[] {
  const fixtures = buildDemoWorkflowFixtures();
  const customersWithPaymentLinks = new Set(
    fixtures.invoices
      .filter((invoice) => invoice.payment_url)
      .map((invoice) => invoice.customer_id),
  );
  const customersWithCompletedHistory = new Set(
    fixtures.jobs
      .filter((job) => job.status === "completed")
      .map((job) => job.customer_id),
  );
  const portalCustomer =
    fixtures.customers.find(
      (customer) =>
        customersWithPaymentLinks.has(customer.id) &&
        customersWithCompletedHistory.has(customer.id),
    ) ??
    fixtures.customers[1] ??
    fixtures.customers[0];
  const portalPath = `/portal/${portalCustomer.id}?access_token=portal-token`;

  return [
    {
      expectedText: ["Dashboard overview"],
      id: "home",
      label: "/",
      path: "/",
      redactedPath: "/",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Dispatch Calendar"],
      id: "dispatch",
      label: "/dispatch",
      path: "/dispatch",
      redactedPath: "/dispatch",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Demo - Rivera Cafe"],
      id: "customers",
      label: "/customers",
      path: "/customers",
      redactedPath: "/customers",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Jobs"],
      id: "jobs",
      label: "/jobs",
      path: "/jobs",
      redactedPath: "/jobs",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Technicians", "Dispatch-ready crew"],
      id: "technicians",
      label: "/technicians",
      path: "/technicians",
      redactedPath: "/technicians",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Inventory"],
      id: "inventory",
      label: "/inventory",
      path: "/inventory",
      redactedPath: "/inventory",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Payments"],
      id: "payments",
      label: "/payments",
      path: "/payments",
      redactedPath: "/payments",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Closeouts"],
      id: "closeouts",
      label: "/closeouts",
      path: "/closeouts",
      redactedPath: "/closeouts",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Compliance Command Center"],
      id: "compliance",
      label: "/compliance",
      path: "/compliance",
      redactedPath: "/compliance",
      requiresAdminSession: true,
    },
    {
      expectedText: ["Provider: Manual fallback", "Manual fallback accepted"],
      id: "automation",
      label: "/automation",
      path: "/automation",
      redactedPath: "/automation",
      requiresAdminSession: true,
    },
    {
      expectedText: [
        portalCustomer.name,
        "Pay invoice",
        "Service and billing history",
        "Recurring service review",
      ],
      id: "portal",
      label: "tokened /portal",
      path: portalPath,
      redactedPath: "/portal/<fixture-customer-id>?access_token=<redacted>",
      requiresAdminSession: false,
    },
  ];
}

export function buildDemoSmokePreflight(
  input: DemoSmokePreflightInput,
): DemoSmokePreflightResult {
  const target = normalizedTarget(input.target);
  const baseUrl = input.baseUrl?.trim() || defaultBaseUrl(target);
  const summary = getDemoSeedPlanSummary(buildDemoSeedPlan());
  const blockers: string[] = [];
  const missingEnvNames = requiredEnvNames.filter(
    (name) => !envValue(input.env, name),
  );
  const supabaseUrl = envValue(input.env, "NEXT_PUBLIC_SUPABASE_URL");

  if (input.target !== "local" && input.target !== "preview") {
    blockers.push("Demo smoke target must be local or preview.");
  }

  if (productionEnv(input) === "production") {
    blockers.push(
      "Demo smoke preflight is disabled for production deployments.",
    );
  }

  for (const envName of missingEnvNames) {
    const reason =
      envName === "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        ? target === "local"
          ? "local app sign-in"
          : "preview app sign-in"
        : "demo seed preflight";
    blockers.push(`${envName} is required for ${reason}.`);
  }

  if (target === "local" && supabaseUrl && !isLocalSupabaseUrl(supabaseUrl)) {
    blockers.push(
      "Local demo smoke requires NEXT_PUBLIC_SUPABASE_URL to point at localhost or 127.0.0.1.",
    );
  }

  if (target === "preview") {
    blockers.push(
      "Protected preview browser smoke requires an operator-approved Vercel preview access path and admin/dispatcher sign-in path.",
    );
  }

  const hasProductionBlocker = blockers.some((blocker) =>
    blocker.includes("production"),
  );
  const hasLocalUrlBlocker = blockers.some((blocker) =>
    blocker.includes("Local demo smoke requires"),
  );
  const shellSeedReady =
    !hasProductionBlocker &&
    !hasLocalUrlBlocker &&
    Boolean(envValue(input.env, "NEXT_PUBLIC_SUPABASE_URL")) &&
    Boolean(envValue(input.env, "SUPABASE_SERVICE_ROLE_KEY")) &&
    (target === "preview" ||
      Boolean(envValue(input.env, "NEXT_PUBLIC_SUPABASE_ANON_KEY")));
  const browserSmokeReady =
    target === "local" && shellSeedReady && blockers.length === 0;
  const ready = browserSmokeReady;

  return {
    baseUrl,
    blockers,
    browserSmokeReady,
    commands: commandsFor({
      baseUrl,
      target,
      techPasswordEnv: input.techPasswordEnv,
    }),
    evidencePrompts: evidenceFor(target),
    missingEnvNames,
    ready,
    shellSeedReady,
    state: ready ? "ready" : "blocked",
    summary,
    target,
  };
}
