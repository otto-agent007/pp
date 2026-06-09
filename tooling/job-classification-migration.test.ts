import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260609170000_job_classification_foundation_v1.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("job classification foundation migration", () => {
  it("adds the required columns with legacy-preserving defaults", () => {
    for (const column of [
      "job_purpose",
      "service_offering_id",
      "service_family",
      "billing_disposition",
      "service_cadence",
      "estimate_status",
      "parent_job_id",
    ]) {
      expect(migrationSql).toContain(`add column if not exists ${column}`);
    }

    expect(migrationSql).toContain("job_purpose text not null default 'service'");
    expect(migrationSql).toContain(
      "billing_disposition text not null default 'billable'",
    );
    expect(migrationSql).toContain(
      "service_cadence text not null default 'one_time'",
    );
    expect(migrationSql).toContain(
      "estimate_status text not null default 'not_applicable'",
    );
    expect(migrationSql).toContain(
      "parent_job_id uuid references public.jobs(id) on delete set null",
    );
  });

  it("adds enum-like checks and required indexes without apply commands", () => {
    for (const constraint of [
      "jobs_job_purpose_check",
      "jobs_billing_disposition_check",
      "jobs_service_cadence_check",
      "jobs_estimate_status_check",
      "jobs_service_family_check",
    ]) {
      expect(migrationSql).toContain(`constraint ${constraint}`);
    }

    for (const indexName of [
      "jobs_job_purpose_idx",
      "jobs_service_offering_id_idx",
      "jobs_service_family_idx",
      "jobs_billing_disposition_idx",
      "jobs_parent_job_id_idx",
    ]) {
      expect(migrationSql).toContain(`create index if not exists ${indexName}`);
    }

    expect(migrationSql).not.toMatch(/supabase\s+db\s+(push|reset)/);
    expect(migrationSql).not.toMatch(/seed-demo-data|compliance:ingest/);
  });
});
