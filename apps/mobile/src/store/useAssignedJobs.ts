import { listAssignedTechnicianJobs } from "@pest-patrol/application";
import type { Job, JobStatus, JobStatusUpdateQueuePayload } from "@pest-patrol/types";
import { create } from "zustand";

import { mobileSupabase } from "../lib/supabase";
import { useOfflineQueue } from "./useOfflineQueue";
import { createJobsAdapter } from "@pest-patrol/api-client";

const jobsPort = createJobsAdapter(mobileSupabase);


type AssignedJobsStatus = "idle" | "loading" | "ready" | "error";

interface AssignedJobsState {
  error: string | null;
  jobs: Job[];
  lastLoadedAt: string | null;
  load: () => Promise<void>;
  queueStatusUpdate: (jobId: string, status: JobStatus) => void;
  reset: () => void;
  status: AssignedJobsStatus;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load assigned jobs";
}

export const useAssignedJobs = create<AssignedJobsState>((set) => ({
  error: null,
  jobs: [],
  lastLoadedAt: null,
  status: "idle",
  load: async () => {
    set({ error: null, status: "loading" });

    try {
      const jobs = await listAssignedTechnicianJobs(jobsPort);

      set({
        error: null,
        jobs,
        lastLoadedAt: new Date().toISOString(),
        status: "ready",
      });
    } catch (error) {
      set({
        error: errorMessage(error),
        status: "error",
      });
    }
  },
  queueStatusUpdate: (jobId, status) => {
    set((state) => {
      const job = state.jobs.find((assignedJob) => assignedJob.id === jobId);

      if (!job || job.status === status) {
        return state;
      }

      const payload = {
        job_id: job.id,
        previous_status: job.status,
        status,
      } satisfies JobStatusUpdateQueuePayload;

      useOfflineQueue.getState().enqueue({
        action: "job_status_update",
        payload,
      });

      return {
        ...state,
        jobs: state.jobs.map((assignedJob) =>
          assignedJob.id === jobId
            ? {
                ...assignedJob,
                status,
                updated_at: new Date().toISOString(),
              }
            : assignedJob,
        ),
      };
    });
  },
  reset: () => {
    set({
      error: null,
      jobs: [],
      lastLoadedAt: null,
      status: "idle",
    });
  },
}));
