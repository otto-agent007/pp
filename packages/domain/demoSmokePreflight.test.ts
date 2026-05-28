import { describe, expect, it } from "vitest";

import {
  DEMO_SEED_CONFIRMATION,
  buildDemoSmokePreflight,
  buildLocalFixtureSmokePlan,
  localFixtureSmokeSensitivePatterns,
  localFixtureSmokeStorageKeys,
} from "./demoSmokePreflight";

describe("demo smoke preflight", () => {
  it("marks local smoke ready when local Supabase env is present", () => {
    const result = buildDemoSmokePreflight({
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
      },
      target: "local",
    });

    expect(result).toMatchObject({
      baseUrl: "http://localhost:3000",
      browserSmokeReady: true,
      missingEnvNames: [],
      ready: true,
      shellSeedReady: true,
      state: "ready",
      target: "local",
    });
    expect(result.summary).toMatchObject({
      admin_users: 1,
      customers: 100,
      jobs: 180,
      technicians: 16,
    });
    expect(result.commands.map((command) => command.command)).toContain(
      `corepack pnpm demo:seed -- --target local --confirm ${DEMO_SEED_CONFIRMATION}`,
    );
    expect(result.evidencePrompts).toContain(
      "Route: local /; Action: click Log in as demo; Result: admin shell loads with the seeded story.",
    );
  });

  it("blocks local smoke with env names only when required env is missing", () => {
    const result = buildDemoSmokePreflight({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        SUPABASE_SERVICE_ROLE_KEY: "do-not-print-this-value",
      },
      target: "local",
    });
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      browserSmokeReady: false,
      missingEnvNames: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      ready: false,
      shellSeedReady: false,
      state: "blocked",
    });
    expect(result.blockers).toContain(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for local app sign-in.",
    );
    expect(serialized).not.toContain("do-not-print-this-value");
  });

  it("blocks local smoke when the Supabase URL is not local", () => {
    const result = buildDemoSmokePreflight({
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
      },
      target: "local",
    });

    expect(result).toMatchObject({
      browserSmokeReady: false,
      missingEnvNames: [],
      ready: false,
      shellSeedReady: false,
      state: "blocked",
    });
    expect(result.blockers).toContain(
      "Local demo smoke requires NEXT_PUBLIC_SUPABASE_URL to point at localhost or 127.0.0.1.",
    );
  });

  it("reports preview shell seed readiness separately from browser handoff", () => {
    const result = buildDemoSmokePreflight({
      baseUrl: "https://preview.example.test",
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
      },
      target: "preview",
      techPasswordEnv: "DEMO_TECH_PASSWORD",
    });

    expect(result).toMatchObject({
      baseUrl: "https://preview.example.test",
      browserSmokeReady: false,
      missingEnvNames: [],
      ready: false,
      shellSeedReady: true,
      state: "blocked",
      target: "preview",
    });
    expect(result.blockers).toContain(
      "Protected preview browser smoke requires an operator-approved Vercel preview access path and admin/dispatcher sign-in path.",
    );
    expect(result.commands.map((command) => command.command)).toContain(
      `corepack pnpm demo:seed -- --target preview --confirm ${DEMO_SEED_CONFIRMATION} --tech-password-env DEMO_TECH_PASSWORD`,
    );
  });

  it("blocks demo smoke in production", () => {
    const result = buildDemoSmokePreflight({
      env: {
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
        VERCEL_ENV: "production",
      },
      target: "preview",
    });

    expect(result).toMatchObject({
      browserSmokeReady: false,
      ready: false,
      shellSeedReady: false,
      state: "blocked",
    });
    expect(result.blockers).toContain(
      "Demo smoke preflight is disabled for production deployments.",
    );
  });

  it("publishes a redacted local fixture browser-smoke route plan", () => {
    const routes = buildLocalFixtureSmokePlan();

    expect(routes.map((route) => route.id)).toEqual([
      "home",
      "dispatch",
      "customers",
      "jobs",
      "technicians",
      "inventory",
      "payments",
      "closeouts",
      "compliance",
      "automation",
      "portal",
    ]);
    expect(routes.find((route) => route.id === "portal")).toMatchObject({
      label: "tokened /portal",
      redactedPath: "/portal/<fixture-customer-id>?access_token=<redacted>",
      requiresAdminSession: false,
    });
    expect(routes.find((route) => route.id === "portal")?.path).toContain(
      "access_token=portal-token",
    );
    expect(
      routes.find((route) => route.id === "portal")?.redactedPath,
    ).not.toContain("portal-token");
    expect(
      routes.find((route) => route.id === "technicians")?.expectedText,
    ).toEqual(["Technicians", "Dispatch-ready crew"]);
    expect(
      routes.find((route) => route.id === "payments")?.expectedText,
    ).toEqual(["Payments"]);
  });

  it("shares fixture auth storage keys and sensitive-pattern guardrails", () => {
    expect(localFixtureSmokeStorageKeys).toEqual([
      "pest-patrol-local-demo-session",
      "pest-patrol-demo-fixture-session",
    ]);
    expect(localFixtureSmokeSensitivePatterns).toContain("access_token=");
    expect(localFixtureSmokeSensitivePatterns).toContain("portal-token");
    expect(localFixtureSmokeSensitivePatterns).toContain("STRIPE_SECRET_KEY");
    expect(localFixtureSmokeSensitivePatterns).toContain(
      "PORTAL_DELIVERY_WEBHOOK_SECRET",
    );
  });
});
