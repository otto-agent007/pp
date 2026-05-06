import { beforeEach, describe, expect, it, vi } from "vitest";

import { createJobGeofenceEventRecord } from "./geofencing";

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  upsert(...args: unknown[]) {
    this.calls.push(["upsert", args]);
    return this;
  }
}

const now = "2026-05-05T22:30:00.000Z";
const event = {
  id: "event-1",
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
};

describe("geofencing api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("upserts geofence events with the authenticated user", async () => {
    const query = new MockQuery({ data: event, error: null });
    const clientFrom = vi.fn().mockReturnValue(query);
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "technician-1" } },
          error: null,
        }),
      },
      from: clientFrom,
    } as never;

    await createJobGeofenceEventRecord(
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

    expect(clientFrom).toHaveBeenCalledWith("job_location_events");
    expect(query.calls[0]).toEqual([
      "upsert",
      [
        expect.objectContaining({
          job_id: "job-1",
          event_type: "arrival",
          recorded_by: "technician-1",
          client_event_id: "00000000-0000-4000-8000-000000000201",
        }),
        { onConflict: "client_event_id" },
      ],
    ]);
  });
});
