import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  auditRlsBoundaryDirectory,
  effectivePolicies,
  readMigrationAuditSources,
} from "./rls-boundary-audit";

const migrationsDir = join(process.cwd(), "supabase/migrations");
const migrationName = "20260916120000_assignment_scope_bounds_v1.sql";
const migrationPath = join(migrationsDir, migrationName);

/**
 * The migration that bounded what "assigned to a job" entitles a technician to,
 * from the 2026-09-10 security review.
 *
 * Nothing in CI executes a migration, so these assertions read the SQL as text
 * and replay it against the migrations before it. The duplicate-policy check is
 * the one that matters most: RLS policies are permissive and OR together, so
 * re-creating a policy under a name that does not match the live one leaves the
 * old, weaker policy in force.
 */
describe("assignment scope bounds migration", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const sources = readMigrationAuditSources(migrationsDir);
  const effective = effectivePolicies(sources);

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

    expect(createdPolicies(sql)).toHaveLength(2);

    for (const policy of createdPolicies(sql)) {
      expect(
        dropped.has(`${policy.table}|${policy.name}`),
        `"${policy.name}" on ${policy.table} is created without an identical drop, which would leave the previous permissive policy in force`,
      ).toBe(true);
    }
  });

  it("re-creates policies that already existed, so no drop is a silent no-op", () => {
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

  it("adds a nullable author column to chemical_logs rather than backfilling one", () => {
    expect(sql).toMatch(
      /alter table public\.chemical_logs\s*\nadd column if not exists logged_by uuid references auth\.users\(id\) on delete set null;/,
    );
    // Guessing an author from jobs.assigned_tech_id would invent attribution
    // for rows that may predate the current assignee.
    expect(sql).not.toMatch(/update public\.chemical_logs\s+set logged_by/i);
    expect(sql).toContain("chemical_logs_logged_by_idx");
  });

  // The insert policy demands logged_by = auth.uid(), and the client never
  // sends the column, so without this default every technician chemical log
  // would be rejected outright.
  it("defaults logged_by to the caller so the client needs no change", () => {
    expect(sql).toMatch(
      /alter table public\.chemical_logs\s*\nalter column logged_by set default auth\.uid\(\);/,
    );
  });

  it("stamps the author on technician chemical-log inserts and leaves the read wide", () => {
    const insert = effective.get(
      "chemical_logs|chemical logs are insertable by admins or assigned technicians",
    );
    const select = effective.get(
      "chemical_logs|chemical logs are readable by admins or assigned technicians",
    );

    expect(insert?.source).toBe(migrationName);
    expect(insert?.statement).toMatch(
      /logged_by\s*=\s*\(\s*select auth\.uid\(\)\s*\)/i,
    );
    // An admin may write a log on a technician's behalf, so the read must not
    // narrow to the author.
    expect(select?.statement).not.toMatch(/logged_by/i);
  });

  it("ends technician unit visibility when the job closes", () => {
    const policy = effective.get(
      "location_units|technicians read assigned location units",
    );

    expect(policy?.source).toBe(migrationName);
    expect(policy?.statement).toMatch(
      /jobs\.status in \('scheduled', 'en_route', 'in_progress'\)/i,
    );
    // The two terminal statuses are the whole point: an unbounded join to jobs
    // turned one past visit into permanent access to the address.
    expect(policy?.statement).not.toMatch(/'completed'/i);
    expect(policy?.statement).not.toMatch(/'canceled'/i);
  });

  it("leaves the migration set free of static error findings", () => {
    expect(
      auditRlsBoundaryDirectory(migrationsDir).filter(
        (finding) => finding.severity === "error",
      ),
    ).toEqual([]);
  });
});
