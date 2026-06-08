import {
  createChemicalLogRecord,
  createGeneratedNotificationEventRecord,
  createJobGeofenceEventRecord,
  createJobFormSubmissionRecord,
  uploadJobPhotoRecord,
  uploadJobSignatureRecord,
  updateAssignedTechnicianJobStatusRecord,
} from "@pest-patrol/api-client";
import { describe, expect, it, vi } from "vitest";

import { createOfflineQueueItem } from "./offlineQueue";
import {
  hasReadyArrivalNotificationQueueItems,
  hasReadyFormSubmissionQueueItems,
  hasReadyGeofenceEventQueueItems,
  hasReadyChemicalLogQueueItems,
  hasReadyJobStatusUpdateQueueItems,
  hasReadyOfflineQueueItems,
  hasReadyPhotoUploadQueueItems,
  hasReadySignatureCaptureQueueItems,
  normalizeArrivalNotificationQueuePayload,
  normalizeChemicalLogQueuePayload,
  normalizeFormSubmissionQueuePayload,
  normalizeJobGeofenceEventQueuePayload,
  normalizeJobPhotoUploadQueuePayload,
  normalizeJobSignatureCaptureQueuePayload,
  normalizeJobStatusUpdateQueuePayload,
  processArrivalNotificationQueueItem,
  processChemicalLogQueueItem,
  processFormSubmissionQueueItem,
  processFormSubmissionQueueItems,
  processGeofenceEventQueueItem,
  processJobStatusUpdateQueueItem,
  processPhotoUploadQueueItem,
  processSignatureCaptureQueueItem,
} from "./offlineSync";

vi.mock("@pest-patrol/api-client", () => ({
  createChemicalLogRecord: vi.fn(),
  createGeneratedNotificationEventRecord: vi.fn(),
  createJobGeofenceEventRecord: vi.fn(),
  createJobFormSubmissionRecord: vi.fn(),
  uploadJobPhotoRecord: vi.fn(),
  uploadJobSignatureRecord: vi.fn(),
  updateAssignedTechnicianJobStatusRecord: vi.fn(),
}));

const now = "2026-05-05T20:00:00.000Z";
const client = {} as never;

function formQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "form_submission_create",
        payload: {
          job_id: "job-1",
          template_id: "template-1",
          form_data: { target_pests: "Ants" },
        },
      },
      { id: "queue-1", now },
    ),
    attempts,
  };
}

function statusQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "job_status_update",
        payload: {
          job_id: "job-1",
          status: "in_progress",
          previous_status: "en_route",
        },
      },
      { id: "queue-status-1", now },
    ),
    attempts,
  };
}

function chemicalQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "chemical_log_create",
        payload: {
          job_id: "job-1",
          chemical_id: "chemical-1",
          amount_used: 1.5,
          notes: "  Kitchen baseboards  ",
        },
      },
      { id: "queue-chemical-1", now },
    ),
    attempts,
  };
}

function photoQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "photo_upload",
        payload: {
          job_id: "job-1",
          local_uri: "file:///photo.jpg",
          file_name: "photo.jpg",
          content_type: "image/jpeg",
          storage_bucket: "job-media",
          storage_path: "job-1/photo.jpg",
          description: "Kitchen",
          captured_at: now,
        },
      },
      { id: "queue-photo-1", now },
    ),
    attempts,
  };
}

function signatureQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "signature_capture",
        payload: {
          job_id: "job-1",
          local_uri: "data:image/png;base64,signature",
          file_name: "signature.png",
          content_type: "image/png",
          storage_bucket: "job-media",
          storage_path: "job-1/signature.png",
          signer_name: "Jamie Customer",
          captured_at: now,
        },
      },
      { id: "queue-signature-1", now },
    ),
    attempts,
  };
}

function geofenceQueueItem(attempts = 0) {
  return {
    ...createOfflineQueueItem(
      {
        action: "geofence_event_create",
        payload: {
          job_id: "job-1",
          event_type: "arrival",
          latitude: 33.8121,
          longitude: -117.919,
          accuracy_m: 12,
          distance_m: 80,
          within_radius: true,
          client_event_id: "00000000-0000-4000-8000-000000000201",
          captured_at: now,
        },
      },
      { id: "queue-geofence-1", now },
    ),
    attempts,
  };
}

function arrivalQueueItem(
  decision: "delay_5_min" | "send_now" | "skip" = "send_now",
  attempts = 0,
) {
  return {
    ...createOfflineQueueItem(
      {
        action: "arrival_notification_create",
        payload: {
          job_id: "job-1",
          client_event_id: "00000000-0000-4000-8000-000000000202",
          decision,
          captured_at: now,
        },
      },
      { id: "queue-arrival-1", now },
    ),
    attempts,
  };
}

describe("offline sync domain", () => {
  it("normalizes form submission queue payloads", () => {
    expect(
      normalizeFormSubmissionQueuePayload({
        job_id: " job-1 ",
        template_id: " template-1 ",
        form_data: { target_pests: "Ants" },
      }),
    ).toEqual({
      job_id: "job-1",
      template_id: "template-1",
      form_data: { target_pests: "Ants" },
    });
  });

  it("normalizes job status update queue payloads", () => {
    expect(
      normalizeJobStatusUpdateQueuePayload({
        job_id: " job-1 ",
        status: "completed",
        previous_status: "in_progress",
      }),
    ).toEqual({
      job_id: "job-1",
      status: "completed",
      previous_status: "in_progress",
    });

    expect(() =>
      normalizeJobStatusUpdateQueuePayload({
        job_id: "job-1",
        status: "not_real",
      }),
    ).toThrow("Job status is invalid");
  });

  it("normalizes chemical log queue payloads", () => {
    expect(
      normalizeChemicalLogQueuePayload({
        job_id: " job-1 ",
        chemical_id: " chemical-1 ",
        amount_used: "2.5",
        notes: "  Crack and crevice ",
      }),
    ).toEqual({
      job_id: "job-1",
      chemical_id: "chemical-1",
      amount_used: 2.5,
      notes: "Crack and crevice",
    });

    expect(() =>
      normalizeChemicalLogQueuePayload({
        job_id: "job-1",
        chemical_id: "chemical-1",
        amount_used: 0,
      }),
    ).toThrow("Amount used must be greater than zero");
  });

  it("normalizes photo upload queue payloads", () => {
    expect(
      normalizeJobPhotoUploadQueuePayload({
        job_id: " job-1 ",
        local_uri: " file:///photo.jpg ",
        file_name: " photo.jpg ",
        content_type: " image/jpeg ",
        storage_bucket: " job-media ",
        storage_path: " job-1/photo.jpg ",
        description: "  Kitchen ",
        captured_at: now,
      }),
    ).toEqual({
      job_id: "job-1",
      local_uri: "file:///photo.jpg",
      file_name: "photo.jpg",
      content_type: "image/jpeg",
      storage_bucket: "job-media",
      storage_path: "job-1/photo.jpg",
      description: "Kitchen",
      captured_at: now,
    });

    expect(() =>
      normalizeJobPhotoUploadQueuePayload({
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "other-job/photo.jpg",
      }),
    ).toThrow("Photo storage path is invalid");
  });

  it("normalizes signature capture queue payloads", () => {
    expect(
      normalizeJobSignatureCaptureQueuePayload({
        job_id: " job-1 ",
        local_uri: " data:image/png;base64,signature ",
        file_name: " signature.png ",
        content_type: " image/png ",
        storage_bucket: " job-media ",
        storage_path: " job-1/signature.png ",
        signer_name: "  Jamie Customer ",
        captured_at: now,
      }),
    ).toEqual({
      job_id: "job-1",
      local_uri: "data:image/png;base64,signature",
      file_name: "signature.png",
      content_type: "image/png",
      storage_bucket: "job-media",
      storage_path: "job-1/signature.png",
      signer_name: "Jamie Customer",
      captured_at: now,
    });

    expect(() =>
      normalizeJobSignatureCaptureQueuePayload({
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.png",
        content_type: "image/png",
        storage_bucket: "job-media",
        storage_path: "other-job/signature.png",
      }),
    ).toThrow("Signature storage path is invalid");
  });

  it("normalizes geofence event queue payloads", () => {
    expect(
      normalizeJobGeofenceEventQueuePayload({
        job_id: " job-1 ",
        event_type: " arrival ",
        latitude: "33.8121",
        longitude: "-117.919",
        accuracy_m: "12",
        distance_m: "80",
        within_radius: true,
        client_event_id: " 00000000-0000-4000-8000-000000000201 ",
        captured_at: now,
      }),
    ).toEqual({
      job_id: "job-1",
      event_type: "arrival",
      latitude: 33.8121,
      longitude: -117.919,
      accuracy_m: 12,
      distance_m: 80,
      within_radius: true,
      client_event_id: "00000000-0000-4000-8000-000000000201",
      captured_at: now,
    });

    expect(() =>
      normalizeJobGeofenceEventQueuePayload({
        job_id: "job-1",
        event_type: "arrival",
        latitude: 100,
        longitude: -117.919,
        client_event_id: "event-1",
        captured_at: now,
      }),
    ).toThrow("Latitude is invalid");
  });

  it("normalizes arrival notification queue payloads", () => {
    expect(
      normalizeArrivalNotificationQueuePayload({
        job_id: " job-1 ",
        client_event_id: " event-1 ",
        decision: "send_now",
        captured_at: now,
      }),
    ).toEqual({
      job_id: "job-1",
      client_event_id: "event-1",
      decision: "send_now",
      captured_at: now,
    });

    expect(() =>
      normalizeArrivalNotificationQueuePayload({
        job_id: "job-1",
        client_event_id: "event-1",
        decision: "not-real",
        captured_at: now,
      }),
    ).toThrow("Arrival notification decision is invalid");
  });

  it("marks successful form submissions as synced", async () => {
    vi.mocked(createJobFormSubmissionRecord).mockResolvedValueOnce({} as never);

    const item = await processFormSubmissionQueueItem(formQueueItem(), {
      client,
      now,
    });

    expect(createJobFormSubmissionRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        template_id: "template-1",
        form_data: { target_pests: "Ants" },
      },
      client,
    );
    expect(item.status).toBe("synced");
    expect(item.last_error).toBeNull();
  });

  it("marks temporary failures as retrying with retry metadata", async () => {
    vi.mocked(createJobFormSubmissionRecord).mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = await processFormSubmissionQueueItem(formQueueItem(), {
      client,
      now,
      retryDelayMs: 120_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Network unavailable",
      next_retry_at: "2026-05-05T20:02:00.000Z",
      status: "retrying",
    });
  });

  it("marks exhausted retries as failed", async () => {
    vi.mocked(createJobFormSubmissionRecord).mockRejectedValueOnce(
      new Error("Permission denied"),
    );

    const item = await processFormSubmissionQueueItem(formQueueItem(2), {
      client,
      maxAttempts: 3,
      now,
    });

    expect(item).toMatchObject({
      attempts: 3,
      last_error: "Permission denied",
      next_retry_at: null,
      status: "failed",
    });
  });

  it("syncs job status updates with the authenticated client", async () => {
    vi.mocked(updateAssignedTechnicianJobStatusRecord).mockResolvedValueOnce(
      {} as never,
    );

    const item = await processJobStatusUpdateQueueItem(statusQueueItem(), {
      client,
      now,
    });

    expect(updateAssignedTechnicianJobStatusRecord).toHaveBeenCalledWith(
      client,
      "job-1",
      "in_progress",
      "en_route",
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary job status sync failures", async () => {
    vi.mocked(updateAssignedTechnicianJobStatusRecord).mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = await processJobStatusUpdateQueueItem(statusQueueItem(), {
      client,
      now,
      retryDelayMs: 60_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Network unavailable",
      next_retry_at: "2026-05-05T20:01:00.000Z",
      status: "retrying",
    });
  });

  it("syncs chemical log creates with the authenticated client", async () => {
    vi.mocked(createChemicalLogRecord).mockResolvedValueOnce({} as never);

    const item = await processChemicalLogQueueItem(chemicalQueueItem(), {
      client,
      now,
    });

    expect(createChemicalLogRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        chemical_id: "chemical-1",
        amount_used: 1.5,
        notes: "Kitchen baseboards",
      },
      client,
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary chemical log sync failures", async () => {
    vi.mocked(createChemicalLogRecord).mockRejectedValueOnce(
      new Error("Insufficient stock"),
    );

    const item = await processChemicalLogQueueItem(chemicalQueueItem(), {
      client,
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Insufficient stock",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
  });

  it("syncs photo uploads with the authenticated client", async () => {
    vi.mocked(uploadJobPhotoRecord).mockResolvedValueOnce({} as never);

    const item = await processPhotoUploadQueueItem(photoQueueItem(), {
      client,
      now,
    });

    expect(uploadJobPhotoRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        local_uri: "file:///photo.jpg",
        file_name: "photo.jpg",
        content_type: "image/jpeg",
        storage_bucket: "job-media",
        storage_path: "job-1/photo.jpg",
        description: "Kitchen",
        captured_at: now,
      },
      client,
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary photo upload sync failures", async () => {
    vi.mocked(uploadJobPhotoRecord).mockRejectedValueOnce(
      new Error("Upload failed"),
    );

    const item = await processPhotoUploadQueueItem(photoQueueItem(), {
      client,
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Upload failed",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
  });

  it("syncs signature captures with the authenticated client", async () => {
    vi.mocked(uploadJobSignatureRecord).mockResolvedValueOnce({} as never);

    const item = await processSignatureCaptureQueueItem(signatureQueueItem(), {
      client,
      now,
    });

    expect(uploadJobSignatureRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        local_uri: "data:image/png;base64,signature",
        file_name: "signature.png",
        content_type: "image/png",
        storage_bucket: "job-media",
        storage_path: "job-1/signature.png",
        signer_name: "Jamie Customer",
        captured_at: now,
      },
      client,
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary signature capture sync failures", async () => {
    vi.mocked(uploadJobSignatureRecord).mockRejectedValueOnce(
      new Error("Signature upload failed"),
    );

    const item = await processSignatureCaptureQueueItem(signatureQueueItem(), {
      client,
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Signature upload failed",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
  });

  it("syncs geofence events with the authenticated client", async () => {
    vi.mocked(createJobGeofenceEventRecord).mockResolvedValueOnce({} as never);

    const item = await processGeofenceEventQueueItem(geofenceQueueItem(), {
      client,
      now,
    });

    expect(createJobGeofenceEventRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        event_type: "arrival",
        latitude: 33.8121,
        longitude: -117.919,
        accuracy_m: 12,
        distance_m: 80,
        within_radius: true,
        client_event_id: "00000000-0000-4000-8000-000000000201",
        captured_at: now,
      },
      client,
    );
    expect(item.status).toBe("synced");
  });

  it.each([
    [
      "send now",
      "send_now",
      "2026-05-05T20:00:00.000Z",
      "pending",
      null,
    ],
    [
      "delay 5 min",
      "delay_5_min",
      "2026-05-05T20:05:00.000Z",
      "pending",
      null,
    ],
    ["skip", "skip", "2026-05-05T20:00:00.000Z", "dismissed", now],
  ] as const)(
    "syncs arrival notification events for %s",
    async (_label, decision, dueAt, status, handledAt) => {
      vi.mocked(createGeneratedNotificationEventRecord).mockResolvedValueOnce(
        {} as never,
      );

      const item = await processArrivalNotificationQueueItem(
        arrivalQueueItem(decision),
        {
          client,
          now,
        },
      );

      expect(createGeneratedNotificationEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: null,
          due_at: dueAt,
          handled_at: handledAt,
          job_id: "job-1",
          status,
          title: "Arrival notice",
          type: "arrival_notification",
        }),
        client,
      );
      expect(item.status).toBe("synced");
    },
  );

  it("retries temporary geofence event sync failures", async () => {
    vi.mocked(createJobGeofenceEventRecord).mockRejectedValueOnce(
      new Error("Location event failed"),
    );

    const item = await processGeofenceEventQueueItem(geofenceQueueItem(), {
      client,
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Location event failed",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
  });

  it("skips synced queue actions and future retry items", async () => {
    const syncedSignature = {
      ...signatureQueueItem(),
      status: "synced" as const,
    };
    const retrying = {
      ...formQueueItem(),
      next_retry_at: "2026-05-05T20:05:00.000Z",
      status: "retrying" as const,
    };

    expect(hasReadyFormSubmissionQueueItems([syncedSignature, retrying], now)).toBe(
      false,
    );
    expect(hasReadyJobStatusUpdateQueueItems([statusQueueItem()], now)).toBe(true);
    expect(hasReadyChemicalLogQueueItems([chemicalQueueItem()], now)).toBe(true);
    expect(hasReadyPhotoUploadQueueItems([photoQueueItem()], now)).toBe(true);
    expect(hasReadySignatureCaptureQueueItems([signatureQueueItem()], now)).toBe(
      true,
    );
    expect(hasReadyGeofenceEventQueueItems([geofenceQueueItem()], now)).toBe(true);
    expect(
      hasReadyArrivalNotificationQueueItems([arrivalQueueItem()], now),
    ).toBe(true);
    expect(
      hasReadyOfflineQueueItems([
        syncedSignature,
        retrying,
        statusQueueItem(),
        chemicalQueueItem(),
        photoQueueItem(),
        signatureQueueItem(),
        geofenceQueueItem(),
        arrivalQueueItem(),
      ], now),
    ).toBe(true);

    const result = await processFormSubmissionQueueItems(
      [syncedSignature, retrying],
      {
        client,
        now,
      },
    );

    expect(result.summary).toEqual({
      failed: 0,
      processed: 0,
      retrying: 0,
      skipped: 2,
      synced: 0,
    });
  });
});
