import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { effectivePolicies, readMigrationAuditSources } from "./rls-boundary-audit";

const migrationsDir = join(process.cwd(), "supabase/migrations");
const migrationPath = join(
  migrationsDir,
  "20260910200000_technician_status_boundary_v1.sql",
);

/**
 * The migration that made profiles.status bind on the technician branches,
 * from the 2026-09-10 security review.
 *
 * Nothing in CI executes a migration, so these assertions read the SQL as text.
 * The one that matters most is the duplicate-policy check: RLS policies are
 * permissive and OR together, so re-creating a policy under a name that does
 * not match the live one leaves the old, weaker policy in place and grants
 * exactly the access this migration set out to remove.
 */
describe("technician status boundary migration", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const sources = readMigrationAuditSources(migrationsDir);

  /** Every policy name this migration creates, in order. */
  function createdPolicies(source: string) {
    return [
      ...source.matchAll(/create policy "([^"]+)"\s*\non ([a-z_.]+)/g),
    ].map((match) => ({ name: match[1] as string, table: match[2] as string }));
  }

  function droppedPolicies(source: string) {
    return [
      ...source.matchAll(
        /drop policy if exists "([^"]+)"\s*\n?\s*on ([a-z_.]+)/g,
      ),
    ].map((match) => ({ name: match[1] as string, table: match[2] as string }));
  }

  it("drops every policy it re-creates, under the identical name and table", () => {
    const dropped = new Set(
      droppedPolicies(sql).map((policy) => `${policy.table}|${policy.name}`),
    );

    for (const policy of createdPolicies(sql)) {
      expect(
        dropped.has(`${policy.table}|${policy.name}`),
        `"${policy.name}" on ${policy.table} is created without an identical drop, which would leave the previous permissive policy in force`,
      ).toBe(true);
    }
  });

  it("re-creates a policy that already existed, so no drop is a silent no-op", () => {
    const priorSources = sources.filter(
      (source) => !source.name.startsWith("20260910200000_"),
    );
    const priorPolicies = new Set(
      [...effectivePolicies(priorSources).values()].map(
        (policy) => `${policy.table}|${policy.name.toLowerCase()}`,
      ),
    );

    for (const policy of createdPolicies(sql)) {
      const table = policy.table.replace(/^public\./, "");
      expect(
        priorPolicies.has(`${table}|${policy.name.toLowerCase()}`),
        `"${policy.name}" on ${policy.table} does not match any policy that exists before this migration, so its drop hits nothing`,
      ).toBe(true);
    }
  });

  it("defines the active-profile predicate and keeps it off the public role", () => {
    expect(sql).toContain(
      "create or replace function private.has_active_profile()",
    );
    expect(sql).toContain("and status = 'active'");
    expect(sql).toContain(
      "revoke all on function private.has_active_profile() from public;",
    );
    expect(sql).toContain(
      "grant execute on function private.has_active_profile() to authenticated;",
    );
  });

  it("leaves no effective policy reaching rows through assigned_tech_id unguarded", () => {
    const unguarded = [...effectivePolicies(sources).values()].filter(
      (policy) =>
        /assigned_tech_id/i.test(policy.statement) &&
        !policy.statement.includes("has_active_profile"),
    );

    expect(unguarded.map((policy) => `${policy.table}|${policy.name}`)).toEqual(
      [],
    );
  });

  it("covers the storage policies that govern the job-media bytes", () => {
    for (const name of [
      "job media objects are readable by admins or assigned technicians",
      "job media objects are insertable by admins or assigned technicians",
    ]) {
      expect(sql).toContain(`create policy "${name}"`);
    }
  });

  it("requires an active profile inside both SECURITY DEFINER technician RPCs", () => {
    for (const name of [
      "update_assigned_job_status",
      "record_assigned_job_geofence_event",
    ]) {
      const start = sql.indexOf(
        `create or replace function public.${name}(`,
      );
      expect(start, name).toBeGreaterThan(-1);
      const body = sql.slice(start, sql.indexOf("\n$$;", start));

      expect(body, name).toContain(
        "if not (select private.has_active_profile()) then",
      );
      expect(body, name).toContain("using errcode = 'PP401'");
    }
  });

  it("stops technicians moving a job back out of completed", () => {
    expect(sql).toContain(
      "if p_expected_previous_status = 'completed' and p_next_status <> 'completed' then",
    );
  });

  it("makes geofence recording write-once rather than an upsert", () => {
    const start = sql.indexOf(
      "create or replace function public.record_assigned_job_geofence_event(",
    );
    const body = sql.slice(start, sql.indexOf("\n$$;", start));

    expect(body).toContain("on conflict (client_event_id) do nothing");
    expect(body).not.toContain("on conflict (client_event_id) do update");
  });

  it("revokes the compliance search RPC from anon and public", () => {
    for (const role of ["public", "anon"]) {
      expect(
        new RegExp(
          `revoke execute on function public\\.match_compliance_chunks\\([^)]*\\) from ${role};`,
        ).test(sql),
      ).toBe(true);
    }
  });
});
