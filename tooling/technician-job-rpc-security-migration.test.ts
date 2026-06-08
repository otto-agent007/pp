import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260608133304_technician_job_rpc_security_v1.sql",
);

describe("technician job RPC security migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

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
    expect(sql).toContain(
      "revoke all on function public.update_assigned_job_status(uuid, text, text) from public",
    );
    expect(sql).toContain(
      "grant execute on function public.update_assigned_job_status(uuid, text, text) to authenticated",
    );
    expect(sql).toContain("revoke all on function public.record_assigned_job_geofence_event");
    expect(sql).toContain("grant execute on function public.record_assigned_job_geofence_event");
  });
});
