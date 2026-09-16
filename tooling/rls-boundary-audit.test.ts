import { describe, expect, it } from "vitest";
import { join } from "node:path";

import { readFileSync } from "node:fs";

import {
  auditRlsBoundaryDirectory,
  auditRlsBoundarySources,
  effectivePolicies,
  rlsBoundaryAuditCodes,
} from "./rls-boundary-audit";

describe("RLS boundary audit", () => {
  // The doc listed four rules while the audit raised five: the rule added by
  // 20260910200000 never reached it. An operator reading the document would
  // have concluded the technician-status gap was unchecked.
  it("documents every finding code it can raise", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs", "RLS_BOUNDARY_AUDIT.md"),
      "utf8",
    );

    expect(rlsBoundaryAuditCodes.length).toBeGreaterThan(0);

    for (const code of rlsBoundaryAuditCodes) {
      expect(
        doc.includes(code),
        `${code} is raised by the audit but not described in docs/RLS_BOUNDARY_AUDIT.md`,
      ).toBe(true);
    }
  });

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

  // A technician's arrival/departure coordinates are one named person's
  // location history. Reaching them through the job's *current* assignee means
  // reassigning a job hands the incoming technician the outgoing one's trail.
  it("flags a personal-record policy that reaches rows by assignment alone", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.job_location_events (id uuid primary key);
          alter table public.job_location_events enable row level security;
          create policy "reassignment leak" on public.job_location_events
            for select using (
              (select private.has_active_profile())
              and exists (
                select 1 from public.jobs
                where jobs.id = job_location_events.job_id
                  and jobs.assigned_tech_id = (select auth.uid())
              )
            );
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "personal_policy_missing_author_check",
          severity: "error",
          table: "job_location_events",
        }),
      ]),
    );
  });

  it("accepts a personal-record policy that also constrains the author", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.job_location_events (id uuid primary key);
          alter table public.job_location_events enable row level security;
          create policy "author scoped" on public.job_location_events
            for select using (
              (select private.has_active_profile())
              and job_location_events.recorded_by = (select auth.uid())
              and exists (
                select 1 from public.jobs
                where jobs.id = job_location_events.job_id
                  and jobs.assigned_tech_id = (select auth.uid())
              )
            );
        `,
      },
    ]);

    expect(
      findings.filter(
        (finding) => finding.code === "personal_policy_missing_author_check",
      ),
    ).toEqual([]);
  });

  // job_id names the job, not the person. chemical_logs went without an author
  // column while its insert trigger moved inventory, so a technician could zero
  // a stock item and leave nothing that said who.
  it("flags an assignment-derived insert that does not stamp its author", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.chemical_logs (id uuid primary key);
          alter table public.chemical_logs enable row level security;
          create policy "unstamped insert" on public.chemical_logs
            for insert with check (
              (select private.has_active_profile())
              and exists (
                select 1 from public.jobs
                where jobs.id = chemical_logs.job_id
                  and jobs.assigned_tech_id = (select auth.uid())
              )
            );
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "insert_policy_missing_author_stamp",
          severity: "error",
          table: "chemical_logs",
        }),
      ]),
    );
  });

  it("accepts an assignment-derived insert that stamps its author", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.chemical_logs (id uuid primary key);
          alter table public.chemical_logs enable row level security;
          create policy "stamped insert" on public.chemical_logs
            for insert with check (
              (select private.has_active_profile())
              and logged_by = (select auth.uid())
              and exists (
                select 1 from public.jobs
                where jobs.id = chemical_logs.job_id
                  and jobs.assigned_tech_id = (select auth.uid())
              )
            );
        `,
      },
    ]);

    expect(
      findings.filter(
        (finding) => finding.code === "insert_policy_missing_author_stamp",
      ),
    ).toEqual([]);
  });

  // The read is deliberately wider than the author: an admin may write a log on
  // a technician's behalf and the technician still has to see it.
  it("does not demand an author stamp on a read policy", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.chemical_logs (id uuid primary key);
          alter table public.chemical_logs enable row level security;
          create policy "assigned read" on public.chemical_logs
            for select using (
              (select private.has_active_profile())
              and exists (
                select 1 from public.jobs
                where jobs.id = chemical_logs.job_id
                  and jobs.assigned_tech_id = (select auth.uid())
              )
            );
        `,
      },
    ]);

    expect(
      findings.filter(
        (finding) => finding.code === "insert_policy_missing_author_stamp",
      ),
    ).toEqual([]);
  });

  // Postgres truncates identifiers at 63 bytes without warning, so two names
  // that differ only past that point are one policy in the database. Six names
  // in this repo are already over the limit.
  it("flags two policy names that truncate to the same identifier", () => {
    const sharedPrefix = "job location events are readable by admins or assigned tec";
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.job_media (id uuid primary key);
          alter table public.job_media enable row level security;
          create policy "${sharedPrefix}hnicians" on public.job_media
            for select using ((select private.has_admin_access()));
          create policy "${sharedPrefix}hnicians and auditors" on public.job_media
            for select using ((select private.has_admin_access()));
        `,
      },
    ]);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_name_truncation_collision",
          severity: "error",
          table: "job_media",
        }),
      ]),
    );
  });

  it("does not flag distinct policy names that fit inside the limit", () => {
    const findings = auditRlsBoundarySources([
      {
        name: "fixture.sql",
        sql: `
          create table public.job_media (id uuid primary key);
          alter table public.job_media enable row level security;
          create policy "admins read job media" on public.job_media
            for select using ((select private.has_admin_access()));
          create policy "admins write job media" on public.job_media
            for insert with check ((select private.has_admin_access()));
        `,
      },
    ]);

    expect(
      findings.filter(
        (finding) => finding.code === "policy_name_truncation_collision",
      ),
    ).toEqual([]);
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
