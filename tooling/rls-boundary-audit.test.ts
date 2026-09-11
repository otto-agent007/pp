import { describe, expect, it } from "vitest";
import { join } from "node:path";

import {
  auditRlsBoundaryDirectory,
  auditRlsBoundarySources,
  effectivePolicies,
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

  it("flags a technician policy that does not check profiles.status", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create policy "technicians read assigned jobs" on public.jobs
            for select to authenticated
            using (assigned_tech_id = (select auth.uid()));
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "technician_policy_missing_status_check",
          severity: "error",
          table: "jobs",
        }),
      ]),
    );
  });

  it("accepts a technician policy once the active-profile predicate is present", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create policy "technicians read assigned jobs" on public.jobs
            for select to authenticated
            using (
              assigned_tech_id = (select auth.uid())
              and (select private.has_active_profile())
            );
        `,
      },
    ]);

    expect(
      findings.filter(
        (finding) => finding.code === "technician_policy_missing_status_check",
      ),
    ).toEqual([]);
  });

  it("judges a policy by its last definition, not an earlier weak one", () => {
    const sources = [
      {
        name: "0001_initial.sql",
        sql: `
          create policy "technicians read assigned jobs" on public.jobs
            for select using (assigned_tech_id = (select auth.uid()));
        `,
      },
      {
        name: "0002_hardening.sql",
        sql: `
          drop policy if exists "technicians read assigned jobs" on public.jobs;
          create policy "technicians read assigned jobs" on public.jobs
            for select using (
              assigned_tech_id = (select auth.uid())
              and (select private.has_active_profile())
            );
        `,
      },
    ];

    expect(
      auditRlsBoundarySources(sources).filter(
        (finding) => finding.code === "technician_policy_missing_status_check",
      ),
    ).toEqual([]);

    const effective = effectivePolicies(sources);
    expect(effective.size).toBe(1);
    expect(effective.get("jobs|technicians read assigned jobs")?.source).toBe(
      "0002_hardening.sql",
    );
  });

  it("forgets a policy that a later migration drops without replacing", () => {
    const effective = effectivePolicies([
      {
        name: "0001_initial.sql",
        sql: `create policy "legacy" on public.jobs for select using (true);`,
      },
      {
        name: "0002_drop.sql",
        sql: `drop policy if exists "legacy" on public.jobs;`,
      },
    ]);

    expect(effective.size).toBe(0);
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
