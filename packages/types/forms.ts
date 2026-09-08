import type { Job } from "./jobs";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select";

export type FormTemplateStatus = "active" | "archived";

export type FormValue = string | number | boolean | null;

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
}

export interface FormTemplateSchema {
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  version: number;
  schema: FormTemplateSchema;
  status: FormTemplateStatus;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateInput {
  name: string;
  version?: number;
  schema: FormTemplateSchema;
  status?: FormTemplateStatus;
}

export interface JobFormData {
  [fieldId: string]: FormValue;
}

export interface JobFormSubmission {
  id: string;
  job_id: string;
  template_id: string;
  form_data: JobFormData;
  submitted_by: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  template?: FormTemplate;
  job?: Job;
}

export interface JobFormSubmissionInput {
  job_id: string;
  template_id: string;
  form_data: JobFormData;
}

export interface FormDraft {
  job_id: string;
  template_id: string;
  values: JobFormData;
  updated_at: string;
  queued_at: string | null;
}
