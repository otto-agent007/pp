import { describe, expect, it } from "vitest";

import {
  buildDispatchLocationEvidenceByJob,
  buildDispatchLocationMapUrl,
  buildJobGeofenceCheck,
  calculateDistanceMeters,
  createJobGeofenceEventQueuePayload,
  validateJobGeofenceEventInput,
} from "./geofencing";

const now = "2026-05-05T22:30:00.000Z";
const later = "2026-05-05T23:15:00.000Z";

const arrivalEvent = {
  id: "event-arrival",
  job_id: "job-1",
  event_type: "arrival",
  latitude: 33.8121,
  longitude: -117.919,
  accuracy_m: 12,
  distance_m: 80,
  within_radius: true,
  recorded_by: "technician-1",
  client_event_id: "00000000-0000-4000-8000-000000000201",
  captured_at: now,
  created_at: now,
} as const;

const departureEvent = {
  ...arrivalEvent,
  id: "event-departure",
  event_type: "departure",
  captured_at: later,
  client_event_id: "00000000-0000-4000-8000-000000000202",
  distance_m: 240,
  within_radius: false,
} as const;

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

  it("builds missing dispatch evidence when no GPS event has synced", () => {
    expect(buildDispatchLocationEvidenceByJob(["job-1"], [])).toEqual({
      "job-1": {
        job_id: "job-1",
        latest_arrival: null,
        latest_departure: null,
        latest_event: null,
        state: "missing",
        summary_label: "No synced GPS evidence yet",
      },
    });
  });

  it("summarizes latest arrival and departure evidence by job", () => {
    const evidence = buildDispatchLocationEvidenceByJob(
      ["job-1"],
      [arrivalEvent, departureEvent],
    )["job-1"];

    expect(evidence.summary_label).toBe("Latest GPS: Departure");
    expect(evidence.latest_event?.event_type).toBe("departure");
    expect(evidence.latest_arrival).toMatchObject({
      event_type: "arrival",
      radius_label: "Within service radius (80 m)",
      radius_state: "inside",
    });
    expect(evidence.latest_departure).toMatchObject({
      event_type: "departure",
      radius_label: "Outside service radius (240 m)",
      radius_state: "outside",
    });
  });

  it("reports dispatch evidence without service coordinates", () => {
    const evidence = buildDispatchLocationEvidenceByJob(
      ["job-1"],
      [
        {
          ...arrivalEvent,
          distance_m: null,
          within_radius: null,
        },
      ],
    )["job-1"];

    expect(evidence.latest_arrival).toMatchObject({
      radius_label: "Service coordinates unavailable",
      radius_state: "unavailable",
    });
  });

  it("builds provider-free external map links", () => {
    expect(
      buildDispatchLocationMapUrl({
        latitude: 33.8121,
        longitude: -117.919,
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=33.8121%2C-117.919",
    );
  });
});
