import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readDoc(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("production-readiness protection closure docs", () => {
  it("keeps every production-readiness security gate visible", () => {
    const closure = readDoc("docs/PROTECTED_PREVIEW_SECURITY_CLOSURE.md");
    const requiredGates = [
      "OWASP API and web-risk inventory",
      "Static route inventory and RLS audit",
      "Static baseline guardrails",
      "Compliance source preflight",
      "Local demo smoke preflight",
      "Protected preview browser smoke",
      "Supabase migration/advisor closure",
      "Supabase leaked-password protection",
      "Vercel Firewall/WAF and rate limits",
      "Stripe test-mode smoke",
      "Portal delivery smoke",
      "Notification delivery smoke",
      "Customer portal privacy smoke",
      "Technician/mobile assigned-job smoke",
      "Privacy and retention sign-off",
    ];

    requiredGates.forEach((gate) => {
      expect(closure).toContain(gate);
    });
  });

  it("keeps live mutations and secret capture explicitly out of scope", () => {
    const closure = readDoc("docs/PROTECTED_PREVIEW_SECURITY_CLOSURE.md");
    const forbiddenScopeStatements = [
      "No migration apply.",
      "No live provider call.",
      "No preview or production data mutation.",
      "No seed/reset write.",
      "No paid scanner or new external service.",
      "No secret, token, reset-link, or raw provider-payload capture in repo docs.",
    ];

    forbiddenScopeStatements.forEach((statement) => {
      expect(closure).toContain(statement);
    });
  });

  it("links the closure ledger from launch readiness docs", () => {
    const productionReadiness = readDoc("docs/PRODUCTION_READINESS.md");
    const previewReadiness = readDoc("docs/PREVIEW_LAUNCH_READINESS.md");

    expect(productionReadiness).toContain("PROTECTED_PREVIEW_SECURITY_CLOSURE.md");
    expect(previewReadiness).toContain("PROTECTED_PREVIEW_SECURITY_CLOSURE.md");
  });
});
