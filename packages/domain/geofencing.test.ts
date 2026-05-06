import { describe, expect, it } from "vitest";

import {
  buildJobGeofenceCheck,
  calculateDistanceMeters,
  createJobGeofenceEventQueuePayload,
  validateJobGeofenceEventInput,
} from "./geofencing";

const now = "2026-05-05T22:30:00.000Z";

describe("geofencing domain", () => {
  it("calculates distance between current and service coordinates", () => {
    const distance = calculateDistanceMeters(
      { latitude: 33.8121, longitude: -117.919 },
      { latitude: 33.8123, longitude: -117.9187 },
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(50);
  });

  it("checks inside, outside, and unavailable geofence states", () => {
    expect(
      buildJobGeofenceCheck(
        { latitude: 33.8121, longitude: -117.919 },
        { latitude: 33.8123, longitude: -117.9187 },
      ),
    ).toMatchObject({ status: "inside", within_radius: true });

    expect(
      buildJobGeofenceCheck(
        { latitude: 33.8121, longitude: -117.919 },
        { latitude: 34.0522, longitude: -118.2437 },
      ),
    ).toMatchObject({ status: "outside", within_radius: false });

    expect(
      buildJobGeofenceCheck({ latitude: 33.8121, longitude: -117.919 }, null),
    ).toEqual({
      distance_m: null,
      status: "unavailable",
      within_radius: null,
    });
  });

  it("creates normalized geofence queue payloads", () => {
    expect(
      createJobGeofenceEventQueuePayload({
        job_id: " job-1 ",
        event_type: "arrival",
        current: { latitude: 33.8121, longitude: -117.919 },
        serviceLocation: { latitude: 33.8123, longitude: -117.9187 },
        accuracy_m: 12,
        client_event_id: "00000000-0000-4000-8000-000000000201",
        captured_at: now,
      }),
    ).toEqual({
      job_id: "job-1",
      event_type: "arrival",
      latitude: 33.8121,
      longitude: -117.919,
      accuracy_m: 12,
      distance_m: expect.any(Number),
      within_radius: true,
      client_event_id: "00000000-0000-4000-8000-000000000201",
      captured_at: now,
    });
  });

  it("rejects invalid geofence payloads", () => {
    expect(() =>
      validateJobGeofenceEventInput({
        job_id: "job-1",
        event_type: "arrival",
        latitude: 100,
        longitude: -117.919,
        client_event_id: "event-1",
        captured_at: now,
      }),
    ).toThrow("Latitude is invalid");

    expect(() =>
      validateJobGeofenceEventInput({
        job_id: "job-1",
        event_type: "not-real" as never,
        latitude: 33.8121,
        longitude: -117.919,
        client_event_id: "event-1",
        captured_at: now,
      }),
    ).toThrow("Geofence event type is invalid");
  });
});
