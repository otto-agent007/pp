import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  getMobileWorkModeChecklist,
  getMobileWorkModeForJob,
  getMobileWorkModeProofExpectations,
  shouldRequireChemicalLogForWorkMode,
  shouldRequirePhotosForWorkMode,
  shouldRequireSignatureForWorkMode,
} from "./mobileWorkModes";

const now = "2026-06-09T12:00:00Z";

function job(overrides: Partial<Job> = {}): Job {
  return {
    assigned_tech_id: null,
    created_at: now,
    customer_id: "customer-1",
    id: "job-1",
    location_id: "location-1",
    scheduled_end: null,
    scheduled_start: now,
    service_notes: null,
    status: "scheduled",
    updated_at: now,
    ...overrides,
  };
}

function renderedModeText(input: Job) {
  const mode = getMobileWorkModeForJob(input);

  return [
    mode.label,
    mode.shortLabel,
    mode.summary,
    mode.primaryActionLabel,
    ...mode.warnings,
    ...mode.proofExpectations,
    ...mode.checklistItems.flatMap((item) => [
      item.id,
      item.label,
      item.summary,
      item.relatedStep,
      item.expectedState,
      String(item.required),
    ]),
  ].join(" ");
}

describe("mobile work modes", () => {
  it("maps estimate jobs to estimate mode without requiring chemicals", () => {
    const input = job({
      billing_disposition: "estimate_only",
      job_purpose: "estimate",
    });
    const mode = getMobileWorkModeForJob(input);

    expect(mode).toMatchObject({
      id: "estimate",
      label: "Estimate",
      shortLabel: "Estimate",
      primaryActionLabel: "Document estimate",
      badgeTone: "warning",
    });
    expect(mode.summary).toBe(
      "Inspect, capture photos, and document the proposed scope. Treatment is not required unless directed.",
    );
    expect(shouldRequireChemicalLogForWorkMode(input)).toBe(false);
    expect(getMobileWorkModeChecklist(input).map((item) => item.id)).toEqual([
      "arrival",
      "inspection_notes",
      "photos",
      "estimate_scope",
      "acknowledgement",
      "sync",
    ]);
  });

  it.each([
    ["monthly", "general_pest_monthly"],
    ["quarterly", "general_pest_quarterly"],
  ] as const)("maps %s recurring jobs to recurring service mode", (cadence, offeringId) => {
    const mode = getMobileWorkModeForJob(
      job({
        service_cadence: cadence,
        service_family: "recurring_general_pest",
        service_offering_id: offeringId,
      }),
    );

    expect(mode).toMatchObject({
      id: "recurring_service",
      label: "Recurring Service",
      shortLabel: "Recurring",
      badgeTone: "success",
    });
  });

  it("maps general pest service jobs to general pest mode", () => {
    expect(
      getMobileWorkModeForJob(
        job({
          job_purpose: "service",
          service_family: "general_pest",
          service_offering_id: "general_pest_initial",
        }),
      ),
    ).toMatchObject({
      id: "general_pest",
      label: "General Pest",
    });
  });

  it.each(["rodent_exclusion", "bird_exclusion"] as const)(
    "maps %s jobs to exclusion/project mode with photo proof",
    (offeringId) => {
      const mode = getMobileWorkModeForJob(
        job({
          job_purpose: "project_phase",
          service_cadence: "project",
          service_offering_id: offeringId,
        }),
      );

      expect(mode).toMatchObject({
        id: "exclusion_project",
        label: "Exclusion / Project",
        badgeTone: "warning",
      });
      expect(shouldRequirePhotosForWorkMode(job({ service_offering_id: offeringId }))).toBe(
        true,
      );
      expect(getMobileWorkModeProofExpectations(job({ service_offering_id: offeringId }))).toContain(
        "Photo proof expected",
      );
    },
  );

  it.each([
    "wdo_escrow_inspection",
    "escrow_clearance_document",
    "termite_inspection",
    "termite_repair",
  ] as const)("maps %s jobs to WDO / Escrow mode with office review warning", (offeringId) => {
    const mode = getMobileWorkModeForJob(
      job({
        service_family: "termite_wdo",
        service_offering_id: offeringId,
      }),
    );

    expect(mode).toMatchObject({
      id: "wdo_escrow",
      label: "WDO / Escrow",
      badgeTone: "info",
    });
    expect(mode.warnings).toContain(
      "Office review required before final document release.",
    );
    expect(shouldRequireChemicalLogForWorkMode(job({ service_offering_id: offeringId }))).toBe(
      false,
    );
  });

  it.each([
    [{ job_purpose: "warranty" }, "Warranty / Callback"],
    [{ job_purpose: "callback" }, "Warranty / Callback"],
    [{ billing_disposition: "no_charge" }, "Warranty / Callback"],
  ] as const)("maps warranty/callback jobs to warranty mode", (overrides, label) => {
    expect(getMobileWorkModeForJob(job(overrides))).toMatchObject({
      id: "warranty_callback",
      label,
    });
  });

  it.each([
    [{ job_purpose: "follow_up" }, "follow_up", "Follow-up"],
    [{ job_purpose: "inspection" }, "inspection", "Inspection"],
  ] as const)("maps %s jobs to focused inspection-style mode", (overrides, id, label) => {
    expect(getMobileWorkModeForJob(job(overrides))).toMatchObject({
      id,
      label,
    });
  });

  it("uses service billing catalog inference only when structured fields are missing", () => {
    expect(
      getMobileWorkModeForJob(
        job({
          service_notes: "Monthly recurring route service",
        }),
      ),
    ).toMatchObject({
      id: "recurring_service",
      label: "Recurring Service",
    });

    expect(
      getMobileWorkModeForJob(
        job({
          job_purpose: "estimate",
          service_notes: "Monthly recurring route service",
        }),
      ),
    ).toMatchObject({
      id: "estimate",
      label: "Estimate",
    });
  });

  it("maps unclassified legacy jobs to standard service fallback", () => {
    const mode = getMobileWorkModeForJob(job());

    expect(mode).toMatchObject({
      id: "standard_service",
      label: "Service",
      shortLabel: "Service",
    });
  });

  it("does not require signature by default for newly introduced modes", () => {
    expect(shouldRequireSignatureForWorkMode(job({ job_purpose: "estimate" }))).toBe(
      false,
    );
    expect(
      shouldRequireSignatureForWorkMode(
        job({ service_offering_id: "rodent_exclusion" }),
      ),
    ).toBe(false);
  });

  it("does not expose internal classification field names in technician copy", () => {
    const text = renderedModeText(
      job({
        billing_disposition: "estimate_only",
        job_purpose: "estimate",
        service_family: "general_pest",
        service_offering_id: "general_pest_initial",
      }),
    );

    expect(text).not.toMatch(
      /job_purpose|billing_disposition|service_offering_id|service_family|service_cadence/i,
    );
  });
});
