import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOfflineQueueItem,
  hasReadyArrivalNotificationQueueItems,
  hasReadyChemicalLogQueueItems,
  hasReadyFormSubmissionQueueItems,
  hasReadyGeofenceEventQueueItems,
  hasReadyJobStatusUpdateQueueItems,
  hasReadyOfflineQueueItems,
  hasReadyPhotoUploadQueueItems,
  hasReadySignatureCaptureQueueItems,
} from "@pest-patrol/domain";
import {
  processArrivalNotificationQueueItem,
  processChemicalLogQueueItem,
  processFormSubmissionQueueItem,
  processFormSubmissionQueueItems,
  processGeofenceEventQueueItem,
  processJobStatusUpdateQueueItem,
  processPhotoUploadQueueItem,
  processSignatureCaptureQueueItem,
} from "./offlineSync";
import type { OfflineSyncPort } from "./ports";

const now = "2026-05-05T20:00:00.000Z";

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

/**
 * A stub port, in place of mocking the adapter module.
 *
 * Ports are what make this possible: the use cases now depend on an interface
 * this test can satisfy directly, so nothing here needs `vi.mock` or any
 * knowledge of how the real adapters reach a provider.
 */
function createStubPort() {
  return {
    createChemicalLogRecord: vi.fn(),
    createGeneratedNotificationEventRecord: vi.fn(),
    createJobGeofenceEventRecord: vi.fn(),
    createJobFormSubmissionRecord: vi.fn(),
    uploadJobPhotoRecord: vi.fn(),
    uploadJobSignatureRecord: vi.fn(),
    updateAssignedTechnicianJobStatusRecord: vi.fn(),
  };
}

let port: ReturnType<typeof createStubPort>;

// The stub is structurally a port; this line fails to compile if it drifts.
const _portShapeCheck: (p: ReturnType<typeof createStubPort>) => OfflineSyncPort = (
  p,
) => p;
void _portShapeCheck;

beforeEach(() => {
  port = createStubPort();
});

describe("offline sync use cases", () => {
  it("marks successful form submissions as synced", async () => {
    port.createJobFormSubmissionRecord.mockResolvedValueOnce({} as never);

    const item = await processFormSubmissionQueueItem(port, formQueueItem(), {
      now,
    });

    expect(port.createJobFormSubmissionRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        template_id: "template-1",
        form_data: { target_pests: "Ants" },
      },
    );
    expect(item.status).toBe("synced");
    expect(item.last_error).toBeNull();
  });

  it("marks temporary failures as retrying with retry metadata", async () => {
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = await processFormSubmissionQueueItem(port, formQueueItem(), {
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
    port.createJobFormSubmissionRecord.mockRejectedValueOnce(
      new Error("Permission denied"),
    );

    const item = await processFormSubmissionQueueItem(port, formQueueItem(2), {
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
    port.updateAssignedTechnicianJobStatusRecord.mockResolvedValueOnce(
      {} as never,
    );

    const item = await processJobStatusUpdateQueueItem(port, statusQueueItem(), {
      now,
    });

    expect(port.updateAssignedTechnicianJobStatusRecord).toHaveBeenCalledWith(
      "job-1",
      "in_progress",
      "en_route",
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary job status sync failures", async () => {
    port.updateAssignedTechnicianJobStatusRecord.mockRejectedValueOnce(
      new Error("Network unavailable"),
    );

    const item = await processJobStatusUpdateQueueItem(port, statusQueueItem(), {
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
    port.createChemicalLogRecord.mockResolvedValueOnce({} as never);

    const item = await processChemicalLogQueueItem(port, chemicalQueueItem(), {
      now,
    });

    expect(port.createChemicalLogRecord).toHaveBeenCalledWith(
      {
        job_id: "job-1",
        chemical_id: "chemical-1",
        amount_used: 1.5,
        notes: "Kitchen baseboards",
      },
    );
    expect(item.status).toBe("synced");
  });

  it("retries temporary chemical log sync failures", async () => {
    port.createChemicalLogRecord.mockRejectedValueOnce(
      new Error("Insufficient stock"),
    );

    const item = await processChemicalLogQueueItem(port, chemicalQueueItem(), {
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
    port.uploadJobPhotoRecord.mockResolvedValueOnce({} as never);

    const item = await processPhotoUploadQueueItem(port, photoQueueItem(), {
      now,
    });

    expect(port.uploadJobPhotoRecord).toHaveBeenCalledWith(
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
    );
    expect(item.status).toBe("synced");
    expect(item.payload).toEqual({
      job_id: "job-1",
      file_name: "photo.jpg",
      content_type: "image/jpeg",
      storage_bucket: "job-media",
      storage_path: "job-1/photo.jpg",
      description: "Kitchen",
      captured_at: now,
    });
  });

  it("retries temporary photo upload sync failures", async () => {
    port.uploadJobPhotoRecord.mockRejectedValueOnce(
      new Error("Upload failed"),
    );

    const item = await processPhotoUploadQueueItem(port, photoQueueItem(), {
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Upload failed",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
    expect(item.payload).toMatchObject({ local_uri: "file:///photo.jpg" });
  });

  it("syncs signature captures with the authenticated client", async () => {
    port.uploadJobSignatureRecord.mockResolvedValueOnce({} as never);

    const item = await processSignatureCaptureQueueItem(port, signatureQueueItem(), {
      now,
    });

    expect(port.uploadJobSignatureRecord).toHaveBeenCalledWith(
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
    );
    expect(item.status).toBe("synced");
    expect(item.payload).toEqual({
      job_id: "job-1",
      file_name: "signature.png",
      content_type: "image/png",
      storage_bucket: "job-media",
      storage_path: "job-1/signature.png",
      signer_name: "Jamie Customer",
      captured_at: now,
    });
  });

  it("retries temporary signature capture sync failures", async () => {
    port.uploadJobSignatureRecord.mockRejectedValueOnce(
      new Error("Signature upload failed"),
    );

    const item = await processSignatureCaptureQueueItem(port, signatureQueueItem(), {
      now,
      retryDelayMs: 90_000,
    });

    expect(item).toMatchObject({
      attempts: 1,
      last_error: "Signature upload failed",
      next_retry_at: "2026-05-05T20:01:30.000Z",
      status: "retrying",
    });
    expect(item.payload).toMatchObject({
      local_uri: "data:image/png;base64,signature",
    });
  });

  it("syncs geofence events with the authenticated client", async () => {
    port.createJobGeofenceEventRecord.mockResolvedValueOnce({} as never);

    const item = await processGeofenceEventQueueItem(port, geofenceQueueItem(), {
      now,
    });

    expect(port.createJobGeofenceEventRecord).toHaveBeenCalledWith(
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
      "Technician arrived",
      "Your Pest Patrol technician has arrived and will begin shortly.",
    ],
    [
      "delay 5 min",
      "delay_5_min",
      "2026-05-05T20:05:00.000Z",
      "pending",
      null,
      "Technician arriving shortly",
      "Your Pest Patrol technician is nearby and will begin shortly after the scheduled delay.",
    ],
    [
      "skip",
      "skip",
      "2026-05-05T20:00:00.000Z",
      "dismissed",
      now,
      "Arrival notice skipped",
      null,
    ],
  ] as const)(
    "syncs arrival notification events for %s",
    async (_label, decision, dueAt, status, handledAt, title, message) => {
      port.createGeneratedNotificationEventRecord.mockResolvedValueOnce(
        {} as never,
      );

      const item = await processArrivalNotificationQueueItem(port, arrivalQueueItem(decision),
        {
          now,
        },
      );

      expect(port.createGeneratedNotificationEventRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: null,
          due_at: dueAt,
          generated_key: `arrival-notice:job-1:00000000-0000-4000-8000-000000000202:${decision}`,
          handled_at: handledAt,
          job_id: "job-1",
          message,
          status,
          title,
          type: "arrival_notification",
        }),
      );
      expect(item.status).toBe("synced");
    },
  );

  it("retries temporary geofence event sync failures", async () => {
    port.createJobGeofenceEventRecord.mockRejectedValueOnce(
      new Error("Location event failed"),
    );

    const item = await processGeofenceEventQueueItem(port, geofenceQueueItem(), {
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

    const result = await processFormSubmissionQueueItems(port, [syncedSignature, retrying],
      {
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
