import {
  createJobFormSubmissionRecord,
  listCustomerPortalFormSubmissionRecords,
  listActiveFormTemplateRecords,
  listJobFormSubmissionRecords,
} from "@pest-patrol/api-client";
import type {
  FormDraft,
  FormField,
  FormFieldType,
  FormTemplate,
  JobFormData,
  JobFormSubmissionInput,
} from "@pest-patrol/types";

const fieldTypes: FormFieldType[] = ["text", "textarea", "number", "boolean", "select"];

export const defaultTreatmentFormTemplate: FormTemplate = {
  id: "00000000-0000-4000-8000-000000000101",
  name: "Treatment Form",
  version: 1,
  status: "active",
  created_at: "2026-05-05T00:00:00.000Z",
  updated_at: "2026-05-05T00:00:00.000Z",
  schema: {
    fields: [
      {
        id: "target_pests",
        label: "Target pests",
        type: "textarea",
        required: true,
        placeholder: "Ants, roaches, rodents",
      },
      {
        id: "areas_treated",
        label: "Areas treated",
        type: "textarea",
        required: true,
        placeholder: "Kitchen, garage, exterior perimeter",
      },
      {
        id: "materials_applied",
        label: "Materials applied",
        type: "textarea",
        placeholder: "Products or methods used",
      },
      {
        id: "customer_instructions",
        label: "Customer instructions",
        type: "textarea",
        placeholder: "Re-entry notes, prep, follow-up instructions",
      },
      {
        id: "follow_up_required",
        label: "Follow-up required",
        type: "boolean",
      },
    ],
  },
};

function timestamp(value?: string) {
  return value ?? new Date().toISOString();
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeFieldValue(field: FormField, value: unknown) {
  if (field.type === "boolean") {
    return value === true;
  }

  if (field.type === "number") {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const numberValue = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numberValue)) {
      throw new Error(`${field.label} must be a number`);
    }

    return numberValue;
  }

  const stringValue = typeof value === "string" ? value.trim() : "";

  if (field.type === "select" && stringValue) {
    const options = field.options ?? [];
    const allowedValues = options.map((option) => option.value);

    if (!allowedValues.includes(stringValue)) {
      throw new Error(`${field.label} is invalid`);
    }
  }

  return stringValue || null;
}

export function validateFormTemplate(template: FormTemplate) {
  requireNonEmpty(template.id, "Form template id");
  requireNonEmpty(template.name, "Form template name");

  if (!Number.isInteger(template.version) || template.version <= 0) {
    throw new Error("Form template version must be greater than zero");
  }

  if (template.schema.fields.length === 0) {
    throw new Error("Form template needs at least one field");
  }

  const fieldIds = new Set<string>();

  template.schema.fields.forEach((field) => {
    requireNonEmpty(field.id, "Form field id");
    requireNonEmpty(field.label, "Form field label");

    if (fieldIds.has(field.id)) {
      throw new Error(`Form field ${field.id} is duplicated`);
    }

    if (!fieldTypes.includes(field.type)) {
      throw new Error(`${field.label} has an invalid field type`);
    }

    if (field.type === "select" && !field.options?.length) {
      throw new Error(`${field.label} needs select options`);
    }

    fieldIds.add(field.id);
  });

  return template;
}

export function createFormDraft(
  jobId: string,
  template: FormTemplate,
  now?: string,
): FormDraft {
  const validTemplate = validateFormTemplate(template);
  const values = validTemplate.schema.fields.reduce<JobFormData>((accumulator, field) => {
    accumulator[field.id] = field.type === "boolean" ? false : null;
    return accumulator;
  }, {});

  return {
    job_id: requireNonEmpty(jobId, "Job"),
    template_id: validTemplate.id,
    values,
    updated_at: timestamp(now),
    queued_at: null,
  };
}

export function updateFormDraftValue(
  draft: FormDraft,
  template: FormTemplate,
  fieldId: string,
  value: unknown,
  now?: string,
): FormDraft {
  const field = validateFormTemplate(template).schema.fields.find(
    (templateField) => templateField.id === fieldId,
  );

  if (!field) {
    throw new Error("Form field is invalid");
  }

  return {
    ...draft,
    values: {
      ...draft.values,
      [fieldId]: normalizeFieldValue(field, value),
    },
    updated_at: timestamp(now),
    queued_at: null,
  };
}

export function normalizeFormSubmissionInput(
  input: JobFormSubmissionInput,
  template: FormTemplate,
): JobFormSubmissionInput {
  const validTemplate = validateFormTemplate(template);
  const formData = validTemplate.schema.fields.reduce<JobFormData>((accumulator, field) => {
    const value = normalizeFieldValue(field, input.form_data[field.id]);

    if (field.required && (value === null || value === "")) {
      throw new Error(`${field.label} is required`);
    }

    accumulator[field.id] = value;
    return accumulator;
  }, {});

  return {
    job_id: requireNonEmpty(input.job_id, "Job"),
    template_id: requireNonEmpty(input.template_id, "Form template"),
    form_data: formData,
  };
}

export function validateFormSubmissionInput(
  input: JobFormSubmissionInput,
  template: FormTemplate,
) {
  return normalizeFormSubmissionInput(input, template);
}

export function formDraftToSubmissionInput(
  draft: FormDraft,
  template: FormTemplate,
) {
  return validateFormSubmissionInput(
    {
      job_id: draft.job_id,
      template_id: draft.template_id,
      form_data: draft.values,
    },
    template,
  );
}

export async function listActiveFormTemplates() {
  return listActiveFormTemplateRecords();
}

export async function listJobFormSubmissions(jobId: string) {
  return listJobFormSubmissionRecords(requireNonEmpty(jobId, "Job"));
}

export async function listCustomerPortalFormSubmissions(customerId: string) {
  return listCustomerPortalFormSubmissionRecords(
    requireNonEmpty(customerId, "Customer"),
  );
}

export async function createJobFormSubmission(
  input: JobFormSubmissionInput,
  template: FormTemplate,
) {
  return createJobFormSubmissionRecord(validateFormSubmissionInput(input, template));
}
