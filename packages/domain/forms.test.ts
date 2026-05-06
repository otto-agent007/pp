import { describe, expect, it } from "vitest";

import {
  createFormDraft,
  defaultTreatmentFormTemplate,
  formDraftToSubmissionInput,
  updateFormDraftValue,
  validateFormSubmissionInput,
  validateFormTemplate,
} from "./forms";

const now = "2026-05-05T18:00:00.000Z";

describe("forms domain", () => {
  it("validates the default treatment template", () => {
    expect(validateFormTemplate(defaultTreatmentFormTemplate).schema.fields).toHaveLength(5);
  });

  it("creates an empty draft with boolean defaults", () => {
    const draft = createFormDraft(" job-1 ", defaultTreatmentFormTemplate, now);

    expect(draft).toMatchObject({
      job_id: "job-1",
      template_id: defaultTreatmentFormTemplate.id,
      queued_at: null,
      updated_at: now,
      values: {
        target_pests: null,
        areas_treated: null,
        follow_up_required: false,
      },
    });
  });

  it("updates and normalizes draft field values", () => {
    const draft = createFormDraft("job-1", defaultTreatmentFormTemplate, now);
    const updated = updateFormDraftValue(
      draft,
      defaultTreatmentFormTemplate,
      "target_pests",
      "  Ants and spiders  ",
      "2026-05-05T18:05:00.000Z",
    );

    expect(updated.values.target_pests).toBe("Ants and spiders");
    expect(updated.updated_at).toBe("2026-05-05T18:05:00.000Z");
  });

  it("rejects missing required submission fields", () => {
    const draft = createFormDraft("job-1", defaultTreatmentFormTemplate, now);

    expect(() =>
      formDraftToSubmissionInput(draft, defaultTreatmentFormTemplate),
    ).toThrow("Target pests is required");
  });

  it("accepts completed treatment submissions", () => {
    const submission = validateFormSubmissionInput(
      {
        job_id: "job-1",
        template_id: defaultTreatmentFormTemplate.id,
        form_data: {
          target_pests: "Roaches",
          areas_treated: "Kitchen and laundry room",
          materials_applied: "",
          customer_instructions: "Keep pets away until dry",
          follow_up_required: true,
        },
      },
      defaultTreatmentFormTemplate,
    );

    expect(submission).toEqual({
      job_id: "job-1",
      template_id: defaultTreatmentFormTemplate.id,
      form_data: {
        target_pests: "Roaches",
        areas_treated: "Kitchen and laundry room",
        materials_applied: null,
        customer_instructions: "Keep pets away until dry",
        follow_up_required: true,
      },
    });
  });
});
