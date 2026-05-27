import type { FormField } from "@pest-patrol/types";

export type TreatmentFieldCopy = {
  label: string;
  placeholder?: string;
};

export type TreatmentFormCopy = {
  fields?: Record<string, TreatmentFieldCopy>;
  requiredFieldError?: string;
};

export function localizeTreatmentFields(
  fields: FormField[],
  copy: TreatmentFormCopy,
) {
  const fieldCopy = copy.fields ?? {};

  return fields.map((field): FormField => {
    const localized = fieldCopy[field.id];

    if (!localized) {
      return field;
    }

    return {
      ...field,
      label: localized.label,
      placeholder: localized.placeholder ?? field.placeholder,
    };
  });
}

export function formatTreatmentFormError(
  message: string,
  fields: FormField[],
  copy: TreatmentFormCopy,
) {
  if (!copy.requiredFieldError) {
    return message;
  }

  const requiredMatch = message.match(/^(.+) is required$/);

  if (!requiredMatch) {
    return message;
  }

  const sourceField = fields.find((field) => field.label === requiredMatch[1]);

  if (!sourceField) {
    return message;
  }

  const localizedLabel = copy.fields?.[sourceField.id]?.label ?? sourceField.label;

  return copy.requiredFieldError.replace("{field}", localizedLabel);
}
