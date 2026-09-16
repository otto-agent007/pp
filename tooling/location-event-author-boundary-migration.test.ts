import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  auditRlsBoundaryDirectory,
  effectivePolicies,
  readMigrationAuditSources,
} from "./rls-boundary-audit";

const migrationsDir = join(process.cwd(), "supabase/migrations");
const migrationName = "20260915190000_location_event_author_boundary_v1.sql";
const migrationPath = join(migrationsDir, migrationName);

/**
 * The migration that stopped a job reassignment handing the incoming
 * technician the outgoing one's GPS trail, from the 2026-09-10 security review.
 *
 * Nothing in CI executes a migration, so these assertions read the SQL as text
 * and replay it against the migrations that come before it. The duplicate-policy
 * check is the one that matters most: RLS policies are permissive and OR
 * together, so re-creating a policy under a name that does not match the live
 * one leaves the old, weaker policy in force and grants exactly the access this
 * migration set out to remove.
 */
describe("location event author boundary migration", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const sources = readMigrationAuditSources(migrationsDir);

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

    expect(createdPolicies(sql)).not.toHaveLength(0);

    for (const policy of createdPolicies(sql)) {
      expect(
        dropped.has(`${policy.table}|${policy.name}`),
        `"${policy.name}" on ${policy.table} is created without an identical drop, which would leave the previous permissive policy in force`,
      ).toBe(true);
    }
  });

  it("re-creates a policy that already existed, so no drop is a silent no-op", () => {
    const priorPolicies = new Set(
      [
        ...effectivePolicies(
          sources.filter((source) => source.name < migrationName),
        ).values(),
      ].map((policy) => `${policy.table}|${policy.name.toLowerCase()}`),
    );

    for (const policy of createdPolicies(sql)) {
      const table = policy.table.replace(/^public\./, "");
      expect(
        priorPolicies.has(`${table}|${policy.name.toLowerCase()}`),
        `"${policy.name}" on ${policy.table} does not match any policy that exists before this migration, so its drop hits nothing`,
      ).toBe(true);
    }
  });

  it("scopes the technician branch to the events that technician recorded", () => {
    const effective = effectivePolicies(sources);
    const policy = effective.get(
      "job_location_events|job location events are readable by admins or assigned technicians",
    );

    expect(policy?.source).toBe(migrationName);
    expect(policy?.statement).toMatch(
      /recorded_by\s*=\s*\(\s*select auth\.uid\(\)\s*\)/i,
    );
    // Assignment still has to hold: leaving the job ends the read, it does not
    // leave a technician with a permanent window into their old jobs.
    expect(policy?.statement).toMatch(/assigned_tech_id/i);
    expect(policy?.statement).toMatch(/has_active_profile/i);
  });

  // The trail is arrival evidence and the audit belongs to the office, so
  // narrowing admins here would break dispatch, closeouts and the command
  // center rather than close anything.
  it("leaves the admin branch able to read the whole trail", () => {
    const policy = effectivePolicies(sources).get(
      "job_location_events|job location events are readable by admins or assigned technicians",
    );

    // The using clause opens with the bare admin predicate and only then
    // branches, so adding a recorded_by term to the admin side breaks this
    // shape rather than silently narrowing what the office can audit.
    expect(policy?.statement).toMatch(
      /using\s*\(\s*\(\s*select\s+private\.has_admin_access\(\)\s*\)\s*or\s*\(/i,
    );
    expect(policy?.statement.match(/recorded_by/gi)).toHaveLength(1);
  });

  it("leaves the migration set free of static error findings", () => {
    expect(
      auditRlsBoundaryDirectory(migrationsDir).filter(
        (finding) => finding.severity === "error",
      ),
    ).toEqual([]);
  });
});
