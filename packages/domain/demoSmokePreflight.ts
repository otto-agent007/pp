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

export type DemoSmokeStepId =
  | "closeouts"
  | "compliance"
  | "customers"
  | "dispatch"
  | "escrow-re"
  | "home"
  | "inventory"
  | "payments"
  | "portal"
  | "technicians";

export interface LocalFixtureSmokeRoute {
  criticalHeadings: string[];
  expectedText: string[];
  id: DemoSmokeStepId;
  keyBusinessStateText: string[];
  label: string;
  path: string;
  progressionCtaLabels: string[];
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
  "demo-token",
  "todo",
  "fixme",
  "not implemented",
  "placeholder",
  "lorem ipsum",
  "internal error",
  "stack trace",
  "stub",
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
  return `corepack pnpm demo:seed -- --target ${target} --confirm ${DEMO_SEED_CONFIRMATION}${techPasswordEnv ? ` --tech-password-env ${techPasswordEnv}` : ""}`;
}

function resetCommand(target: DemoSeedTarget) {
  return `corepack pnpm demo:reset -- --target ${target} --confirm ${DEMO_SEED_CONFIRMATION}`;
}

function commandsFor(input: {
  baseUrl: string;
  target: DemoSeedTarget;
  techPasswordEnv?: string;
}): DemoSmokePreflightCommand[] {
  const preflightCommand = `corepack pnpm demo:smoke -- --target ${input.target}${input.baseUrl !== defaultBaseUrl(input.target) ? ` --base-url ${input.baseUrl}` : ""}${input.techPasswordEnv ? ` --tech-password-env ${input.techPasswordEnv}` : ""}`;

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
    ) ?? fixtures.customers[1] ?? fixtures.customers[0];
  const portalPath = `/portal/${portalCustomer.id}?access_token=portal-token`;

  return [
    {
      criticalHeadings: ["Dashboard overview"],
      expectedText: ["Dashboard overview"],
      id: "home",
      keyBusinessStateText: ["Customer ops", "Dispatch", "Billing"],
      label: "1. /",
      path: "/",
      progressionCtaLabels: ["Dispatch", "Customers", "Closeouts", "Payments"],
      redactedPath: "/",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Dispatch Calendar"],
      expectedText: ["Dispatch Calendar"],
      id: "dispatch",
      keyBusinessStateText: ["Route intelligence", "Today's Dispatch", "Missing"],
      label: "2. /dispatch",
      path: "/dispatch",
      progressionCtaLabels: ["Customers", "Closeouts", "Technicians", "Inventory"],
      redactedPath: "/dispatch",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Customers"],
      expectedText: ["Customers"],
      id: "customers",
      keyBusinessStateText: ["Portal access", "open balance", "service history"],
      label: "3. /customers",
      path: "/customers",
      progressionCtaLabels: [
        "Closeouts",
        "Payments",
        "Portal",
        "Generate",
        "Share",
      ],
      redactedPath: "/customers",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Closeouts"],
      expectedText: ["Closeouts"],
      id: "closeouts",
      keyBusinessStateText: ["Needs proof", "Invoice", "Billing ready"],
      label: "4. /closeouts",
      path: "/closeouts",
      progressionCtaLabels: [
        "Payments",
        "Invoice",
        "WDO / Escrow",
        "Review",
      ],
      redactedPath: "/closeouts",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Payments"],
      expectedText: ["Payments"],
      id: "payments",
      keyBusinessStateText: [
        "WDO / Escrow readiness",
        "Create invoice",
        "Mark paid",
      ],
      label: "5. /payments",
      path: "/payments",
      progressionCtaLabels: [
        "Create",
        "Payment",
        "WDO / Escrow",
        "Open WDO / Escrow readiness",
      ],
      redactedPath: "/payments",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Compliance Command Center"],
      expectedText: ["Compliance Command Center"],
      id: "compliance",
      keyBusinessStateText: ["Chemical Product Binder", "WDO / Branch 3", "Advisory"],
      label: "6. /compliance",
      path: "/compliance",
      progressionCtaLabels: [
        "Inventory",
        "Closeouts",
        "Escrow",
        "Technicians",
      ],
      redactedPath: "/compliance",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Inventory", "Chemical Product Binder"],
      expectedText: ["Inventory"],
      id: "inventory",
      keyBusinessStateText: ["Chemical usage", "Source readiness", "Low stock"],
      label: "7. /inventory",
      path: "/inventory",
      progressionCtaLabels: [
        "Technicians",
        "Compliance",
        "Closeouts",
        "Dispatch",
      ],
      redactedPath: "/inventory",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Technicians"],
      expectedText: ["Technicians"],
      id: "technicians",
      keyBusinessStateText: ["Active", "Credentials", "License"],
      label: "8. /technicians",
      path: "/technicians",
      progressionCtaLabels: [
        "Dispatch",
        "Customers",
        "Closeouts",
        "Payments",
      ],
      redactedPath: "/technicians",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["WDO / Escrow Clearance"],
      expectedText: ["WDO / Escrow Clearance"],
      id: "escrow-re",
      keyBusinessStateText: [
        "Operator review required",
        "Needs evidence",
        "Draft release",
      ],
      label: "9. /escrow-re",
      path: "/escrow-re",
      progressionCtaLabels: [
        "Payments",
        "Closeouts",
        "Invoice",
        "Customer",
        "Home",
      ],
      redactedPath: "/escrow-re",
      requiresAdminSession: true,
    },
    {
      criticalHeadings: ["Customer portal", "Pay invoice"],
      expectedText: [
        portalCustomer.name,
        "Customer portal",
        "Pay invoice",
      ],
      id: "portal",
      keyBusinessStateText: ["Invoice", "Service history", "Review", "Recurring"],
      label: "10. tokened /portal",
      path: portalPath,
      progressionCtaLabels: [],
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
    evidenceFor: evidenceFor(target),
    missingEnvNames,
    ready,
    shellSeedReady,
    state: ready ? "ready" : "blocked",
    summary,
    target,
  };
}
