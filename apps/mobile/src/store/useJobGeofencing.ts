import { createJobGeofenceEventQueuePayload } from "@pest-patrol/domain";
import type {
  JobGeofenceEventQueuePayload,
  JobGeofenceEventType,
} from "@pest-patrol/types";
import { create } from "zustand";

import { useOfflineQueue } from "./useOfflineQueue";

interface QueueGeofenceEventInput {
  accuracyM?: number | null;
  eventType: JobGeofenceEventType;
  jobId: string;
  latitude: number;
  longitude: number;
  serviceLatitude?: number | null;
  serviceLongitude?: number | null;
}

interface JobGeofenceDraft {
  lastEvent: JobGeofenceEventQueuePayload | null;
  queuedAt: string | null;
}

interface JobGeofencingState {
  drafts: Record<string, JobGeofenceDraft>;
  getDraft: (jobId: string) => JobGeofenceDraft;
  queueGeofenceEvent: (
    input: QueueGeofenceEventInput,
  ) => JobGeofenceEventQueuePayload;
}

function emptyDraft(): JobGeofenceDraft {
  return {
    lastEvent: null,
    queuedAt: null,
  };
}

export const useJobGeofencing = create<JobGeofencingState>((set, get) => ({
  drafts: {},
  getDraft: (jobId) => get().drafts[jobId] ?? emptyDraft(),
  queueGeofenceEvent: (input) => {
    const serviceLocation =
      input.serviceLatitude === null ||
      input.serviceLatitude === undefined ||
      input.serviceLongitude === null ||
      input.serviceLongitude === undefined
        ? null
        : {
            latitude: input.serviceLatitude,
            longitude: input.serviceLongitude,
          };
    const payload = createJobGeofenceEventQueuePayload({
      job_id: input.jobId,
      event_type: input.eventType,
      current: {
        latitude: input.latitude,
        longitude: input.longitude,
      },
      serviceLocation,
      accuracy_m: input.accuracyM,
    });

    useOfflineQueue.getState().enqueue({
      action: "geofence_event_create",
      payload,
    });

    set((state) => ({
      drafts: {
        ...state.drafts,
        [input.jobId]: {
          lastEvent: payload,
          queuedAt: new Date().toISOString(),
        },
      },
    }));

    return payload;
  },
}));
