import { createJobSignatureCaptureQueuePayload } from "@pest-patrol/domain";
import type { JobSignatureCaptureQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { useOfflineQueue } from "./useOfflineQueue";

const JOB_SIGNATURE_DRAFTS_STORAGE_KEY = "pest-patrol:job-signature-drafts:v1";

interface JobSignatureDraft {
  queuedAt: string | null;
  queuedSignatures: JobSignatureCaptureQueuePayload[];
  signerName: string;
}

interface QueueSignatureInput {
  fileSizeBytes?: number | null;
  jobId: string;
  localUri: string;
}

interface JobSignaturesState {
  drafts: Record<string, JobSignatureDraft>;
  getDraft: (jobId: string) => JobSignatureDraft;
  hydrate: () => Promise<void>;
  queueSignature: (
    input: QueueSignatureInput,
  ) => JobSignatureCaptureQueuePayload;
  setSignerName: (jobId: string, signerName: string) => void;
}

function emptyDraft(): JobSignatureDraft {
  return {
    queuedAt: null,
    queuedSignatures: [],
    signerName: "",
  };
}

export const useJobSignatures = create<JobSignaturesState>((set, get) => ({
  drafts: {},
  getDraft: (jobId) => get().drafts[jobId] ?? emptyDraft(),
  hydrate: async () => {
    const drafts = await readMobileJson<Record<string, JobSignatureDraft>>(
      JOB_SIGNATURE_DRAFTS_STORAGE_KEY,
      {},
    );

    set({ drafts });
  },
  queueSignature: (input) => {
    const draft = get().getDraft(input.jobId);
    const payload = createJobSignatureCaptureQueuePayload({
      job_id: input.jobId,
      local_uri: input.localUri,
      file_size_bytes: input.fileSizeBytes,
      signer_name: draft.signerName,
    });

    useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload,
    });

    set((state) => {
      const drafts = {
        ...state.drafts,
        [input.jobId]: {
          queuedAt: new Date().toISOString(),
          queuedSignatures: [...draft.queuedSignatures, payload],
          signerName: "",
        },
      };
      writeMobileJson(JOB_SIGNATURE_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });

    return payload;
  },
  setSignerName: (jobId, signerName) => {
    set((state) => {
      const drafts = {
        ...state.drafts,
        [jobId]: {
          ...emptyDraft(),
          ...state.drafts[jobId],
          queuedAt: null,
          signerName,
        },
      };
      writeMobileJson(JOB_SIGNATURE_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });
  },
}));
