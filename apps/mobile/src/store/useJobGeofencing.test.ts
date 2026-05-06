import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobGeofencing } from "./useJobGeofencing";
import { useOfflineQueue } from "./useOfflineQueue";

const now = "2026-05-05T22:30:00.000Z";

describe("useJobGeofencing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    useJobGeofencing.setState({ drafts: {} });
    useOfflineQueue.setState({ items: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues geofence events for offline sync", () => {
    const payload = useJobGeofencing.getState().queueGeofenceEvent({
      jobId: "job-1",
      eventType: "arrival",
      latitude: 33.8121,
      longitude: -117.919,
      accuracyM: 12,
      serviceLatitude: 33.8123,
      serviceLongitude: -117.9187,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        job_id: "job-1",
        event_type: "arrival",
        within_radius: true,
      }),
    );
    expect(useOfflineQueue.getState().items[0]).toMatchObject({
      action: "geofence_event_create",
      payload,
      status: "queued",
    });
    expect(useJobGeofencing.getState().getDraft("job-1")).toMatchObject({
      lastEvent: payload,
      queuedAt: now,
    });
  });

  it("queues geofence events without radius data when service coordinates are absent", () => {
    const payload = useJobGeofencing.getState().queueGeofenceEvent({
      jobId: "job-1",
      eventType: "departure",
      latitude: 33.8121,
      longitude: -117.919,
    });

    expect(payload).toMatchObject({
      distance_m: null,
      event_type: "departure",
      within_radius: null,
    });
  });
});
