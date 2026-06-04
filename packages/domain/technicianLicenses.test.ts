import { describe, expect, it } from "vitest";
import type {
  Job,
  TechnicianLicense,
  TechnicianProfile,
} from "@pest-patrol/types";

import {
  getBranchCredentialSummary,
  getChemicalLogCredentialReview,
  getCredentialReadinessForJob,
  getTechnicianCredentialStatus,
  getWdoCredentialReview,
  validateTechnicianLicenseInput,
} from "./technicianLicenses";

const now = "2026-06-04T12:00:00.000Z";
const technician: TechnicianProfile = {
  id: "tech-1",
  role: "technician",
  email: "tech@example.test",
  display_name: "Credential Tech",
  status: "active",
  created_at: now,
  updated_at: now,
};
const job: Job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: "tech-1",
  status: "completed",
  scheduled_start: now,
  scheduled_end: null,
  service_notes: "WDO escrow inspection with Branch 3 review.",
  created_at: now,
  updated_at: now,
};

function license(update: Partial<TechnicianLicense> = {}): TechnicianLicense {
  return {
    id: "license-1",
    technician_id: "tech-1",
    license_type: "operator",
    branch: "branch_3",
    license_number: "OPR-123",
    issuing_authority: "spcb",
    status: "active",
    expires_at: "2026-12-31",
    notes: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...update,
  };
}

describe("technician license domain", () => {
  it("validates and trims technician license input", () => {
    expect(
      validateTechnicianLicenseInput({
        technician_id: " tech-1 ",
        license_type: "operator",
        branch: "branch_3",
        license_number: " OPR-123 ",
        issuing_authority: " spcb ",
        status: "active",
        expires_at: "2026-12-31",
        notes: " Branch 3 reviewer ",
      }),
    ).toEqual({
      technician_id: "tech-1",
      license_type: "operator",
      branch: "branch_3",
      license_number: "OPR-123",
      issuing_authority: "spcb",
      status: "active",
      expires_at: "2026-12-31",
      notes: "Branch 3 reviewer",
    });
  });

  it("marks active unexpired credentials ready", () => {
    expect(getTechnicianCredentialStatus([license()], now)).toEqual(
      expect.objectContaining({
        activeCount: 1,
        expiredCount: 0,
        expiringSoonCount: 0,
        status: "ready",
      }),
    );
  });

  it("warns when active credentials expire within 45 days", () => {
    const status = getTechnicianCredentialStatus(
      [license({ expires_at: "2026-07-10" })],
      now,
    );

    expect(status).toEqual(
      expect.objectContaining({
        expiringSoonCount: 1,
        status: "expiring_soon",
      }),
    );
    expect(status.summary).toContain("expiration review");
  });

  it("requires review for expired or missing credentials", () => {
    expect(
      getTechnicianCredentialStatus(
        [license({ expires_at: "2026-01-01" })],
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        expiredCount: 1,
        status: "review_required",
      }),
    );
    expect(getTechnicianCredentialStatus([], now)).toEqual(
      expect.objectContaining({
        status: "review_required",
        summary: "license evidence missing",
      }),
    );
  });

  it("summarizes Branch 3 readiness for WDO work", () => {
    const summary = getBranchCredentialSummary(technician, [license()], now);

    expect(summary.branch3.status).toBe("ready");
    expect(getWdoCredentialReview(job, [license()], now)).toEqual(
      expect.objectContaining({
        status: "ready",
        summary: "Branch 3 credential ready",
      }),
    );
  });

  it("requires credential review when job or chemical log identity cannot be resolved", () => {
    expect(
      getCredentialReadinessForJob(
        { ...job, assigned_tech_id: null },
        [license()],
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        status: "review_required",
        summary: "license evidence missing",
      }),
    );
    expect(
      getChemicalLogCredentialReview(
        {
          job: undefined,
        },
        [license()],
        now,
      ),
    ).toEqual(
      expect.objectContaining({
        status: "review_required",
        summary:
          "Technician credential cannot be verified because this chemical log does not include technician identity.",
      }),
    );
  });

  it("uses advisory credential copy without legalistic wording", () => {
    const copy = [
      getTechnicianCredentialStatus([], now).summary,
      getWdoCredentialReview(job, [], now).summary,
      getChemicalLogCredentialReview(
        { ...job, job_id: job.id } as never,
        [],
        now,
      ).summary,
    ].join(" ");

    expect(copy).toMatch(
      /credential review required|license evidence missing/i,
    );
    expect(copy.toLowerCase()).not.toMatch(/violation|illegal|non-compliant/);
  });
});
