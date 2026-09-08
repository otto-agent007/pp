import { describe, expect, it } from "vitest";

import {
  normalizeArrivalNotificationQueuePayload,
  normalizeChemicalLogQueuePayload,
  normalizeFormSubmissionQueuePayload,
  normalizeJobGeofenceEventQueuePayload,
  normalizeJobPhotoUploadQueuePayload,
  normalizeJobSignatureCaptureQueuePayload,
  normalizeJobStatusUpdateQueuePayload,
} from "./offlineSync";

const now = "2026-05-05T20:00:00.000Z";
describe("offline sync", () => {
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
});
