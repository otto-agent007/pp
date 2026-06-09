import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260608133304_technician_job_rpc_security_v1.sql",
);
const grantsMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20260609000000_supabase_rpc_execute_grants_hardening_v1.sql",
);

describe("technician job RPC security migration", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const grantsSql = readFileSync(grantsMigrationPath, "utf8");
  const grantsSqlLower = grantsSql.toLowerCase();
  const sqlLower = sql.toLowerCase();

  it("removes broad assigned-technician job row updates", () => {
    expect(sql).toContain(
      'drop policy if exists "jobs are updateable by admins or assigned technicians"',
    );
    expect(sql).toContain('create policy "admins update jobs"');
    expect(sql).not.toMatch(
      /create policy "jobs are updateable by admins or assigned technicians"/,
    );
  });

  it("adds status and geofence RPCs with assignment and freshness checks", () => {
    expect(sql).toContain("public.update_assigned_job_status");
    expect(sql).toContain("jobs.assigned_tech_id = (select auth.uid())");
    expect(sql).toContain("jobs.status = p_expected_previous_status");
    expect(sql).toContain("public.record_assigned_job_geofence_event");
    expect(sql).toContain("v_job.assigned_tech_id is distinct from (select auth.uid())");
    expect(sql).toContain("p_captured_at < now() - interval '24 hours'");
    expect(sql).toContain("p_captured_at > now() + interval '5 minutes'");
  });

  it("grants only authenticated execution for technician RPCs", () => {
    expect(grantsSqlLower).toContain(
      "revoke execute on function public.update_assigned_job_status(uuid, text, text) from anon;",
    );
    expect(sql).toContain(
      "revoke all on function public.update_assigned_job_status(uuid, text, text) from public",
    );
    expect(sql).toContain(
      "grant execute on function public.update_assigned_job_status(uuid, text, text) to authenticated",
    );
    expect(grantsSqlLower).toContain(
      "revoke execute on function public.update_assigned_job_status(uuid, text, text) from public;",
    );
    expect(grantsSqlLower).toContain(
      "grant execute on function public.update_assigned_job_status(uuid, text, text) to authenticated;",
    );
    expect(grantsSqlLower).toContain(
      "revoke execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) from anon;",
    );
    expect(grantsSqlLower).toContain(
      "revoke execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) from public;",
    );
    expect(grantsSqlLower).toContain(
      "grant execute on function public.record_assigned_job_geofence_event(uuid, text, numeric, numeric, numeric, uuid, timestamptz) to authenticated;",
    );
    expect(grantsSqlLower).not.toMatch(
      /\bgrant execute on function public\.update_assigned_job_status\(uuid, text, text\) to anon\b/,
    );
    expect(grantsSqlLower).not.toMatch(
      /\bgrant execute on function public\.record_assigned_job_geofence_event\(uuid, text, numeric, numeric, numeric, uuid, timestamptz\) to anon\b/,
    );
    expect(grantsSqlLower).not.toMatch(
      /\bgrant execute on function public\.update_assigned_job_status\(uuid, text, text\) to public\b/,
    );
    expect(grantsSqlLower).not.toMatch(
      /\bgrant execute on function public\.record_assigned_job_geofence_event\(uuid, text, numeric, numeric, numeric, uuid, timestamptz\) to public\b/,
    );
    expect(grantsSqlLower).not.toContain("revoke all on");
  });

  it("keeps function-level assignment and freshness checks in migration SQL", () => {
    expect(sqlLower).toContain("jobs.assigned_tech_id = (select auth.uid())");
    expect(sqlLower).toContain("jobs.status = p_expected_previous_status");
    expect(sqlLower).toContain("jobs.status <> 'canceled'");
    expect(sqlLower).toContain(
      "v_job.assigned_tech_id is distinct from (select auth.uid())",
    );
    expect(sqlLower).toContain("p_captured_at < now() - interval '24 hours'");
    expect(sqlLower).toContain("p_captured_at > now() + interval '5 minutes'");
    expect(sqlLower).toContain("on conflict (client_event_id) do update");
    expect(sqlLower).toContain("where job_location_events.job_id = p_job_id");
    expect(sqlLower).toContain("and job_location_events.recorded_by = (select auth.uid())");
  });
});
