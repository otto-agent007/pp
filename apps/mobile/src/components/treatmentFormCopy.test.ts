import { defaultTreatmentFormTemplate } from "@pest-patrol/domain";
import { translations } from "@pest-patrol/i18n";
import { describe, expect, it } from "vitest";

import {
  formatTreatmentFormError,
  localizeTreatmentFields,
} from "./treatmentFormCopy";

describe("treatment form copy", () => {
  it("localizes treatment form labels and placeholders without changing field ids", () => {
    const fields = localizeTreatmentFields(
      defaultTreatmentFormTemplate.schema.fields,
      translations.es.jobs.fieldCopy.treatment,
    );

    expect(fields.map((field) => field.id)).toEqual(
      defaultTreatmentFormTemplate.schema.fields.map((field) => field.id),
    );
    expect(fields.find((field) => field.id === "target_pests")).toMatchObject({
      label: "Plagas objetivo",
      placeholder: "Hormigas, cucarachas, roedores",
    });
    expect(fields.find((field) => field.id === "areas_treated")).toMatchObject({
      label: "Áreas tratadas",
      placeholder: "Cocina, garaje, perímetro exterior",
    });
    expect(
      fields.find((field) => field.id === "epa_label_reviewed"),
    ).toMatchObject({
      label: "Etiqueta EPA revisada",
      type: "boolean",
    });
    expect(
      defaultTreatmentFormTemplate.schema.fields.find(
        (field) => field.id === "target_pests",
      ),
    ).toMatchObject({
      label: "Target pests",
      placeholder: "Ants, roaches, rodents",
    });
  });

  it("localizes required-field validation copy from the unchanged domain template", () => {
    expect(
      formatTreatmentFormError(
        "Target pests is required",
        defaultTreatmentFormTemplate.schema.fields,
        translations.es.jobs.fieldCopy.treatment,
      ),
    ).toBe("El campo Plagas objetivo es obligatorio");
    expect(
      formatTreatmentFormError(
        "Areas treated is required",
        defaultTreatmentFormTemplate.schema.fields,
        translations.es.jobs.fieldCopy.treatment,
      ),
    ).toBe("El campo Áreas tratadas es obligatorio");
    expect(
      formatTreatmentFormError(
        "Network unavailable",
        defaultTreatmentFormTemplate.schema.fields,
        translations.es.jobs.fieldCopy.treatment,
      ),
    ).toBe("Network unavailable");
  });
});
