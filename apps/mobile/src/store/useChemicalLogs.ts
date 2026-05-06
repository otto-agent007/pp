import { normalizeChemicalLogInput } from "@pest-patrol/domain";
import type { ChemicalLogQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { useOfflineQueue } from "./useOfflineQueue";

interface ChemicalLogDraft {
  amount: string;
  chemicalId: string;
  notes: string;
  queuedAt: string | null;
}

interface ChemicalLogsState {
  drafts: Record<string, ChemicalLogDraft>;
  getDraft: (jobId: string) => ChemicalLogDraft;
  queueLog: (jobId: string) => void;
  setDraftField: (
    jobId: string,
    field: "amount" | "chemicalId" | "notes",
    value: string,
  ) => void;
}

function emptyDraft(): ChemicalLogDraft {
  return {
    amount: "",
    chemicalId: "",
    notes: "",
    queuedAt: null,
  };
}

export const useChemicalLogs = create<ChemicalLogsState>((set, get) => ({
  drafts: {},
  getDraft: (jobId) => get().drafts[jobId] ?? emptyDraft(),
  queueLog: (jobId) => {
    const draft = get().getDraft(jobId);
    const normalized = normalizeChemicalLogInput({
      job_id: jobId,
      chemical_id: draft.chemicalId,
      amount_used: Number(draft.amount),
      notes: draft.notes,
    });
    const payload = {
      job_id: normalized.job_id,
      chemical_id: normalized.chemical_id,
      amount_used: normalized.amount_used,
      notes: normalized.notes,
    } satisfies ChemicalLogQueuePayload;

    useOfflineQueue.getState().enqueue({
      action: "chemical_log_create",
      payload,
    });

    set((state) => ({
      drafts: {
        ...state.drafts,
        [jobId]: {
          amount: "",
          chemicalId: draft.chemicalId,
          notes: "",
          queuedAt: new Date().toISOString(),
        },
      },
    }));
  },
  setDraftField: (jobId, field, value) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [jobId]: {
          ...emptyDraft(),
          ...state.drafts[jobId],
          [field]: value,
          queuedAt: null,
        },
      },
    }));
  },
}));
