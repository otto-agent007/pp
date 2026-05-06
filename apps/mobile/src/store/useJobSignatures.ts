import { createJobSignatureCaptureQueuePayload } from "@pest-patrol/domain";
import type { JobSignatureCaptureQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { useOfflineQueue } from "./useOfflineQueue";

interface JobSignatureDraft {
  queuedAt: string | null;
  queuedSignatures: JobSignatureCaptureQueuePayload[];
  signerName: string;
}

interface QueueSignatureInput {
  jobId: string;
  localUri: string;
}

interface JobSignaturesState {
  drafts: Record<string, JobSignatureDraft>;
  getDraft: (jobId: string) => JobSignatureDraft;
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
  queueSignature: (input) => {
    const draft = get().getDraft(input.jobId);
    const payload = createJobSignatureCaptureQueuePayload({
      job_id: input.jobId,
      local_uri: input.localUri,
      signer_name: draft.signerName,
    });

    useOfflineQueue.getState().enqueue({
      action: "signature_capture",
      payload,
    });

    set((state) => ({
      drafts: {
        ...state.drafts,
        [input.jobId]: {
          queuedAt: new Date().toISOString(),
          queuedSignatures: [...draft.queuedSignatures, payload],
          signerName: "",
        },
      },
    }));

    return payload;
  },
  setSignerName: (jobId, signerName) => {
    set((state) => ({
      drafts: {
        ...state.drafts,
        [jobId]: {
          ...emptyDraft(),
          ...state.drafts[jobId],
          queuedAt: null,
          signerName,
        },
      },
    }));
  },
}));
