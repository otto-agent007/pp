import { describe, expect, it } from "vitest";
import { join } from "node:path";

import {
  auditRlsBoundaryDirectory,
  auditRlsBoundarySources,
} from "./rls-boundary-audit";

describe("RLS boundary audit", () => {
  it("flags anon grants on sensitive operational tables", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.job_media (id uuid primary key);
          alter table public.job_media enable row level security;
          grant select on public.job_media to anon;
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "anon_sensitive_grant",
          severity: "error",
          table: "job_media",
        }),
      ]),
    );
  });

  it("flags unconditional true policies on sensitive tables", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.customer_portal_sessions (id uuid primary key);
          alter table public.customer_portal_sessions enable row level security;
          create policy "unsafe" on public.customer_portal_sessions
            for select using (true);
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "sensitive_using_true",
          severity: "error",
          table: "customer_portal_sessions",
        }),
      ]),
    );
  });

  it("flags sensitive table references without RLS enablement evidence", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: "create table public.technician_licenses (id uuid primary key);",
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing_rls_enablement",
          severity: "warning",
          table: "technician_licenses",
        }),
      ]),
    );
  });

  it("flags public RPC execute grants for review", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: "grant execute on function public.lookup_customer(uuid) to anon;",
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "public_rpc_grant",
          severity: "warning",
        }),
      ]),
    );
  });

  it("keeps current migrations free of static error findings", () => {
    const findings = auditRlsBoundaryDirectory(
      join(process.cwd(), "supabase", "migrations"),
    );

    expect(findings.filter((finding) => finding.severity === "error")).toEqual(
      [],
    );
  });
});
