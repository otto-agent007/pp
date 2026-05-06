import {
  createFormDraft,
  defaultTreatmentFormTemplate,
  formDraftToSubmissionInput,
  updateFormDraftValue,
} from "@pest-patrol/domain";
import type {
  FormDraft,
  FormSubmissionQueuePayload,
  FormTemplate,
  FormValue,
} from "@pest-patrol/types";
import { create } from "zustand";

import { useOfflineQueue } from "./useOfflineQueue";

interface FormDraftState {
  clearDraft: (jobId: string, templateId?: string) => void;
  drafts: Record<string, FormDraft>;
  enqueueDraft: (jobId: string, template?: FormTemplate) => void;
  getDraft: (jobId: string, template?: FormTemplate) => FormDraft;
  setFieldValue: (
    jobId: string,
    fieldId: string,
    value: FormValue,
    template?: FormTemplate,
  ) => void;
}

function draftKey(jobId: string, templateId: string) {
  return `${jobId}:${templateId}`;
}

function payloadFromDraft(draft: FormDraft, template: FormTemplate) {
  const submission = formDraftToSubmissionInput(draft, template);

  return {
    form_data: submission.form_data,
    job_id: submission.job_id,
    template_id: submission.template_id,
  } satisfies FormSubmissionQueuePayload;
}

export const useFormDrafts = create<FormDraftState>((set, get) => ({
  clearDraft: (jobId, templateId = defaultTreatmentFormTemplate.id) => {
    const key = draftKey(jobId, templateId);

    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[key];

      return { drafts };
    });
  },
  drafts: {},
  enqueueDraft: (jobId, template = defaultTreatmentFormTemplate) => {
    const draft = get().getDraft(jobId, template);
    const payload = payloadFromDraft(draft, template);

    useOfflineQueue.getState().enqueue({
      action: "form_submission_create",
      payload,
    });

    set((state) => ({
      drafts: {
        ...state.drafts,
        [draftKey(jobId, template.id)]: {
          ...draft,
          queued_at: new Date().toISOString(),
        },
      },
    }));
  },
  getDraft: (jobId, template = defaultTreatmentFormTemplate) => {
    const key = draftKey(jobId, template.id);
    const existing = get().drafts[key];

    if (existing) {
      return existing;
    }

    return createFormDraft(jobId, template);
  },
  setFieldValue: (jobId, fieldId, value, template = defaultTreatmentFormTemplate) => {
    const key = draftKey(jobId, template.id);
    const draft = get().drafts[key] ?? createFormDraft(jobId, template);
    const nextDraft = updateFormDraftValue(draft, template, fieldId, value);

    set((state) => ({
      drafts: {
        ...state.drafts,
        [key]: nextDraft,
      },
    }));
  },
}));
