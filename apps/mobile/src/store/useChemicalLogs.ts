import { normalizeChemicalLogInput } from "@pest-patrol/domain";
import type { ChemicalLogQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { useOfflineQueue } from "./useOfflineQueue";

const CHEMICAL_LOG_DRAFTS_STORAGE_KEY = "pest-patrol:chemical-log-drafts:v1";

interface ChemicalLogDraft {
  amount: string;
  chemicalId: string;
  notes: string;
  queuedAt: string | null;
}

interface ChemicalLogsState {
  drafts: Record<string, ChemicalLogDraft>;
  getDraft: (jobId: string) => ChemicalLogDraft;
  hydrate: () => Promise<void>;
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
  hydrate: async () => {
    const drafts = await readMobileJson<Record<string, ChemicalLogDraft>>(
      CHEMICAL_LOG_DRAFTS_STORAGE_KEY,
      {},
    );

    set({ drafts });
  },
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

    set((state) => {
      const drafts = {
        ...state.drafts,
        [jobId]: {
          amount: "",
          chemicalId: draft.chemicalId,
          notes: "",
          queuedAt: new Date().toISOString(),
        },
      };
      writeMobileJson(CHEMICAL_LOG_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });
  },
  setDraftField: (jobId, field, value) => {
    set((state) => {
      const drafts = {
        ...state.drafts,
        [jobId]: {
          ...emptyDraft(),
          ...state.drafts[jobId],
          [field]: value,
          queuedAt: null,
        },
      };
      writeMobileJson(CHEMICAL_LOG_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });
  },
}));
