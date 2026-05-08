import { createJobPhotoUploadQueuePayload } from "@pest-patrol/domain";
import type { JobPhotoUploadQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { useOfflineQueue } from "./useOfflineQueue";

const JOB_PHOTO_DRAFTS_STORAGE_KEY = "pest-patrol:job-photo-drafts:v1";

interface JobPhotoDraft {
  description: string;
  queuedAt: string | null;
  queuedPhotos: JobPhotoUploadQueuePayload[];
}

interface QueuePhotoInput {
  contentType?: string | null;
  fileName?: string | null;
  jobId: string;
  localUri: string;
}

interface JobPhotosState {
  drafts: Record<string, JobPhotoDraft>;
  getDraft: (jobId: string) => JobPhotoDraft;
  hydrate: () => Promise<void>;
  queuePhoto: (input: QueuePhotoInput) => JobPhotoUploadQueuePayload;
  setDescription: (jobId: string, description: string) => void;
}

function emptyDraft(): JobPhotoDraft {
  return {
    description: "",
    queuedAt: null,
    queuedPhotos: [],
  };
}

export const useJobPhotos = create<JobPhotosState>((set, get) => ({
  drafts: {},
  getDraft: (jobId) => get().drafts[jobId] ?? emptyDraft(),
  hydrate: async () => {
    const drafts = await readMobileJson<Record<string, JobPhotoDraft>>(
      JOB_PHOTO_DRAFTS_STORAGE_KEY,
      {},
    );

    set({ drafts });
  },
  queuePhoto: (input) => {
    const draft = get().getDraft(input.jobId);
    const payload = createJobPhotoUploadQueuePayload({
      job_id: input.jobId,
      local_uri: input.localUri,
      file_name: input.fileName,
      content_type: input.contentType,
      description: draft.description,
    });

    useOfflineQueue.getState().enqueue({
      action: "photo_upload",
      payload,
    });

    set((state) => {
      const drafts = {
        ...state.drafts,
        [input.jobId]: {
          description: "",
          queuedAt: new Date().toISOString(),
          queuedPhotos: [...draft.queuedPhotos, payload],
        },
      };
      writeMobileJson(JOB_PHOTO_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });

    return payload;
  },
  setDescription: (jobId, description) => {
    set((state) => {
      const drafts = {
        ...state.drafts,
        [jobId]: {
          ...emptyDraft(),
          ...state.drafts[jobId],
          description,
          queuedAt: null,
        },
      };
      writeMobileJson(JOB_PHOTO_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });
  },
}));
