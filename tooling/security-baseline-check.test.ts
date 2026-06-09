import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runSecurityBaseline } from "./security-baseline-check";

let root: string;

function write(relativePath: string, content: string) {
  const fullPath = join(root, relativePath);
  mkdirSync(fullPath.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  writeFileSync(fullPath, content);
}

function prepareRoot() {
  root = join(tmpdir(), `pp-security-baseline-${Date.now()}-${Math.random()}`);
  mkdirSync(root, { recursive: true });
  write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  write(
    "apps/web/next.config.test.ts",
    "import { describe, it } from 'vitest'; describe('next config', () => { it('exists', () => {}); });\n",
  );
}

function secretFixture() {
  return "sk_" + "live_" + "fixtureSecretValue";
}

describe("security baseline check", () => {
  beforeEach(() => {
    prepareRoot();
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  it("detects committed env files with secret-like values", () => {
    write(".env.local", `${"STRIPE_" + "SECRET_KEY"}=${secretFixture()}\n`);

    const findings = runSecurityBaseline(root);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "committed-env-file" }),
        expect.objectContaining({ rule: "stripe-live-key" }),
        expect.objectContaining({ rule: "stripe-secret-env-assignment" }),
      ]),
    );
    expect(JSON.stringify(findings)).not.toContain(secretFixture());
  });

  it("ignores placeholder env examples", () => {
    write(
      ".env.example",
      "NEXT_PUBLIC_SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nSTRIPE_SECRET_KEY=\n",
    );

    expect(runSecurityBaseline(root)).toEqual([]);
  });

  it("flags service-role references in client files", () => {
    write(
      "apps/web/app/customers/client.tsx",
      "'use client';\nimport { createServiceRoleSupabaseClient } from '../api/_lib/server-auth';\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;\nvoid createServiceRoleSupabaseClient;\n",
    );

    expect(runSecurityBaseline(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "client-service-role-reference" }),
        expect.objectContaining({ rule: "unsafe-service-role-reference" }),
      ]),
    );
  });

  it("allows service-role helpers in server API routes", () => {
    write(
      "apps/web/app/api/_lib/server-auth.ts",
      "export function createServiceRoleSupabaseClient() { return process.env.SUPABASE_SERVICE_ROLE_KEY; }\n",
    );

    expect(runSecurityBaseline(root)).toEqual([]);
  });

  it("flags raw portal token leakage in list responses", () => {
    write(
      "apps/web/app/api/portal/access-tokens/route.ts",
      "export function GET() { return Response.json({ tokens: [{ token_hash: 'hash' }] }); }\n",
    );

    expect(runSecurityBaseline(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "portal-list-token-leakage" }),
      ]),
    );
  });

  it("flags direct customer portal imports of internal compliance modules", () => {
    write(
      "apps/web/app/portal/[customerId]/page.tsx",
      "import { buildComplianceAdvisory } from '../../../api/compliance/internal';\n",
    );

    expect(runSecurityBaseline(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "portal-admin-internal-import" }),
      ]),
    );
  });
});
