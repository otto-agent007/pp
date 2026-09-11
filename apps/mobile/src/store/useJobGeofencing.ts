import { createJobGeofenceEventQueuePayload } from "@pest-patrol/domain";
import type {
  ArrivalNotificationDecision,
  ArrivalNotificationQueuePayload,
  JobGeofenceEventQueuePayload,
  JobGeofenceEventType,
} from "@pest-patrol/types";
import { create } from "zustand";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { mobileStorageKeys } from "./storageKeys";
import { useOfflineQueue } from "./useOfflineQueue";

const JOB_GEOFENCE_DRAFTS_STORAGE_KEY = mobileStorageKeys.jobGeofenceDrafts;

interface QueueGeofenceEventInput {
  accuracyM?: number | null;
  eventType: JobGeofenceEventType;
  jobId: string;
  latitude: number;
  longitude: number;
  serviceLatitude?: number | null;
  serviceLongitude?: number | null;
}

interface QueueArrivalNotificationInput {
  capturedAt: string;
  clientEventId: string;
  decision: ArrivalNotificationDecision;
  jobId: string;
}

interface ArrivalNotificationDraft {
  clientEventId: string;
  decision: ArrivalNotificationDecision;
  queuedAt: string;
}

interface JobGeofenceDraft {
  arrivalNotice: ArrivalNotificationDraft | null;
  lastEvent: JobGeofenceEventQueuePayload | null;
  queuedAt: string | null;
}

interface JobGeofencingState {
  drafts: Record<string, JobGeofenceDraft>;
  getDraft: (jobId: string) => JobGeofenceDraft;
  hydrate: () => Promise<void>;
  queueGeofenceEvent: (
    input: QueueGeofenceEventInput,
  ) => JobGeofenceEventQueuePayload;
  queueArrivalNotification: (
    input: QueueArrivalNotificationInput,
  ) => ArrivalNotificationQueuePayload;
}

function emptyDraft(): JobGeofenceDraft {
  return {
    arrivalNotice: null,
    lastEvent: null,
    queuedAt: null,
  };
}

function arrivalNotificationPayload(
  input: QueueArrivalNotificationInput,
): ArrivalNotificationQueuePayload {
  return {
    captured_at: input.capturedAt,
    client_event_id: input.clientEventId,
    decision: input.decision,
    job_id: input.jobId,
  };
}

export const useJobGeofencing = create<JobGeofencingState>((set, get) => ({
  drafts: {},
  getDraft: (jobId) => get().drafts[jobId] ?? emptyDraft(),
  hydrate: async () => {
    const storedDrafts = await readMobileJson<Record<string, JobGeofenceDraft>>(
      JOB_GEOFENCE_DRAFTS_STORAGE_KEY,
      {},
    );
    const drafts = Object.fromEntries(
      Object.entries(storedDrafts).map(([jobId, draft]) => [
        jobId,
        {
          arrivalNotice: draft.arrivalNotice ?? null,
          lastEvent: draft.lastEvent ?? null,
          queuedAt: draft.queuedAt ?? null,
        },
      ]),
    );

    set({ drafts });
  },
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

    set((state) => {
      const drafts = {
        ...state.drafts,
        [input.jobId]: {
          arrivalNotice: null,
          lastEvent: payload,
          queuedAt: new Date().toISOString(),
        },
      };
      writeMobileJson(JOB_GEOFENCE_DRAFTS_STORAGE_KEY, drafts);

      return { drafts };
    });

    return payload;
  },
  queueArrivalNotification: (input) => {
    const draft = get().drafts[input.jobId] ?? emptyDraft();

    if (
      !draft.lastEvent ||
      draft.lastEvent.event_type !== "arrival" ||
      draft.lastEvent.client_event_id !== input.clientEventId
    ) {
      throw new Error("Arrival event is required");
    }

    const queuedAt = new Date().toISOString();
    const existingArrivalNotice =
      draft.arrivalNotice?.clientEventId === input.clientEventId
        ? draft.arrivalNotice
        : null;
    const payload = arrivalNotificationPayload({
      ...input,
      decision: existingArrivalNotice?.decision ?? input.decision,
    });

    if (!existingArrivalNotice) {
      useOfflineQueue.getState().enqueue({
        action: "arrival_notification_create",
        payload,
      });

      set((state) => {
        const nextDrafts = {
          ...state.drafts,
          [input.jobId]: {
            ...draft,
            arrivalNotice: {
              clientEventId: input.clientEventId,
              decision: input.decision,
              queuedAt,
            },
          },
        };
        writeMobileJson(JOB_GEOFENCE_DRAFTS_STORAGE_KEY, nextDrafts);

        return { drafts: nextDrafts };
      });
    }

    return payload;
  },
}));
