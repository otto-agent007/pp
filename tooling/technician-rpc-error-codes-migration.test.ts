import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const codesMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260909000000_technician_rpc_error_codes_v1.sql",
);
const securityMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260608133304_technician_job_rpc_security_v1.sql",
);

/**
 * The migration that gave the technician RPCs error codes, which CR20 added.
 *
 * Nothing in CI executes a migration, so these assertions read the SQL as text.
 * That is enough for what matters here: every guard raises with a code, the
 * codes are the ones `packages/api-client` maps, and the messages did not move.
 */
describe("technician RPC error codes migration", () => {
  const sql = readFileSync(codesMigrationPath, "utf8");
  const securitySql = readFileSync(securityMigrationPath, "utf8");

  /** Every `raise exception` in a body, paired with the code it carries. */
  function raisesWithCodes(body: string): [string, string | null][] {
    const matches = [
      ...body.matchAll(
        /raise exception '([^']*)'(?:\s*\n\s*using errcode = '([^']*)')?;/g,
      ),
    ];

    return matches.map((match) => [match[1] as string, match[2] ?? null]);
  }

  function functionBody(source: string, name: string): string {
    const start = source.indexOf(`create or replace function public.${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const end = source.indexOf("\n$$;", start);
    expect(end, name).toBeGreaterThan(start);

    return source.slice(start, end);
  }

  it("replaces both technician RPCs rather than only one", () => {
    expect(sql).toContain(
      "create or replace function public.update_assigned_job_status(",
    );
    expect(sql).toContain(
      "create or replace function public.record_assigned_job_geofence_event(",
    );
  });

  it("gives every guard in both functions an error code", () => {
    for (const name of [
      "update_assigned_job_status",
      "record_assigned_job_geofence_event",
    ]) {
      const raises = raisesWithCodes(functionBody(sql, name));

      expect(raises.length, name).toBeGreaterThan(0);
      // A guard without a code still arrives as P0001, which is the state this
      // migration exists to leave.
      expect(
        raises.filter(([, code]) => code === null),
        name,
      ).toEqual([]);
    }
  });

  it("raises only codes packages/api-client maps to a reason", () => {
    const mapped = new Set(["PP400", "PP401", "PP404", "PP409"]);
    const raised = new Set(
      raisesWithCodes(sql)
        .map(([, code]) => code)
        .filter((code): code is string => code !== null),
    );

    expect([...raised].sort().filter((code) => !mapped.has(code))).toEqual([]);
  });

  it("separates the two failures that share one geofence message", () => {
    const geofence = functionBody(sql, "record_assigned_job_geofence_event");
    const shared = raisesWithCodes(geofence).filter(
      ([message]) => message === "Assigned job geofence event is not allowed",
    );

    // The reason the codes exist: this message is raised for a job assigned to
    // someone else and for an idempotent upsert that matched someone else's
    // row. No text matcher can tell those apart.
    expect(shared).toHaveLength(2);
    expect(new Set(shared.map(([, code]) => code)).size).toBe(2);
  });

  it("changes no message, so an app released before it still matches text", () => {
    const before = raisesWithCodes(securitySql).map(([message]) => message);
    const after = raisesWithCodes(sql).map(([message]) => message);

    // Both functions travel whole and the security migration raises nowhere
    // else, so the message sequence has to be identical. A changed message
    // would silently break every client released before this migration.
    expect(after).toEqual(before);
  });
});
