import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJobGeofenceEventRecord,
  listJobGeofenceEventRecords,
} from "./geofencing";

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return Promise.resolve(this.result);
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

  it("records geofence events through the assigned-technician RPC", async () => {
    const query = new MockQuery({ data: event, error: null });
    const clientRpc = vi.fn().mockReturnValue(query);
    const client = {
      rpc: clientRpc,
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

    expect(clientRpc).toHaveBeenCalledWith("record_assigned_job_geofence_event", {
      p_accuracy_m: 12,
      p_captured_at: now,
      p_client_event_id: "00000000-0000-4000-8000-000000000201",
      p_event_type: "arrival",
      p_job_id: "job-1",
      p_latitude: 33.8121,
      p_longitude: -117.919,
    });
    expect(query.calls).toContainEqual([
      "select",
      ["*, job:jobs(*, customer:customers(*), location:locations(*))"],
    ]);
  });

  it("lists geofence events with job and location context", async () => {
    const query = new MockQuery({ data: [event], error: null });
    const clientFrom = vi.fn().mockReturnValue(query);
    const client = {
      from: clientFrom,
    } as never;

    const result = await listJobGeofenceEventRecords(client);

    expect(result).toEqual([event]);
    expect(clientFrom).toHaveBeenCalledWith("job_location_events");
    expect(query.calls).toContainEqual([
      "select",
      ["*, job:jobs(*, customer:customers(*), location:locations(*))"],
    ]);
    expect(query.calls).toContainEqual([
      "order",
      ["captured_at", { ascending: false }],
    ]);
  });
});
