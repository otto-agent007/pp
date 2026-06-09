import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelJobRecord,
  createJobRecord,
  listAssignedTechnicianJobRecords,
  listCustomerPortalJobRecords,
  listJobRecords,
  listTechnicianProfiles,
  updateAssignedTechnicianJobStatusRecord,
  updateJobRecord,
} from "./jobs";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-05T00:00:00Z";
const job = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: null,
  scheduled_start: "2026-05-06T09:00:00Z",
  scheduled_end: null,
  status: "scheduled",
  service_notes: null,
  created_at: now,
  updated_at: now,
};

describe("job api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
  });

  it("lists jobs with customer, location, and technician joins", async () => {
    const jobsQuery = new MockQuery({ data: [job], error: null });
    from.mockReturnValue(jobsQuery as never);

    const jobs = await listJobRecords();

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      billing_disposition: "billable",
      estimate_status: "not_applicable",
      job_purpose: "service",
      service_cadence: "one_time",
    });
    expect(from).toHaveBeenCalledWith("jobs");
    expect(jobsQuery.calls[0]).toEqual([
      "select",
      ["*, customer:customers(*), location:locations(*), assigned_technician:profiles(*)"],
    ]);
  });

  it("lists jobs assigned to the current technician", async () => {
    const jobsQuery = new MockQuery({
      data: [{ ...job, assigned_tech_id: "technician-1" }],
      error: null,
    });
    const clientFrom = vi.fn().mockReturnValue(jobsQuery);
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "technician-1" } },
          error: null,
        }),
      },
      from: clientFrom,
    } as never;

    const jobs = await listAssignedTechnicianJobRecords(client);

    expect(jobs).toHaveLength(1);
    expect(clientFrom).toHaveBeenCalledWith("jobs");
    expect(jobsQuery.calls).toContainEqual([
      "eq",
      ["assigned_tech_id", "technician-1"],
    ]);
  });

  it("lists completed customer portal jobs scoped to one customer", async () => {
    const jobsQuery = new MockQuery({
      data: [{ ...job, status: "completed" }],
      error: null,
    });
    from.mockReturnValue(jobsQuery as never);

    const jobs = await listCustomerPortalJobRecords("customer-1");

    expect(jobs).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("jobs");
    expect(jobsQuery.calls).toContainEqual(["eq", ["customer_id", "customer-1"]]);
    expect(jobsQuery.calls).toContainEqual(["eq", ["status", "completed"]]);
  });

  it("creates a job", async () => {
    const jobQuery = new MockQuery({
      data: {
        ...job,
        billing_disposition: "included_in_recurring",
        job_purpose: "service",
        service_cadence: "quarterly",
        service_family: "recurring_general_pest",
        service_offering_id: "general_pest_quarterly",
      },
      error: null,
    });
    from.mockReturnValue(jobQuery as never);

    const created = await createJobRecord({
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: null,
      scheduled_start: "2026-05-06T09:00:00Z",
      scheduled_end: null,
      service_notes: "Interior",
      billing_disposition: "included_in_recurring",
      job_purpose: "service",
      service_cadence: "quarterly",
      service_family: "recurring_general_pest",
      service_offering_id: "general_pest_quarterly",
    });

    expect(created.service_family).toBe("recurring_general_pest");
    expect(jobQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          billing_disposition: "included_in_recurring",
          customer_id: "customer-1",
          location_id: "location-1",
          status: "scheduled",
          service_notes: "Interior",
          service_cadence: "quarterly",
          service_family: "recurring_general_pest",
          service_offering_id: "general_pest_quarterly",
        }),
      ],
    ]);
  });

  it("updates a job", async () => {
    const jobQuery = new MockQuery({ data: job, error: null });
    from.mockReturnValue(jobQuery as never);

    await updateJobRecord("job-1", {
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: "technician-1",
      scheduled_start: "2026-05-06T09:00:00Z",
      scheduled_end: null,
      status: "en_route",
      service_notes: null,
      billing_disposition: "billable",
      job_purpose: "project_phase",
      service_cadence: "project",
      service_family: "rodent_attic",
      service_offering_id: "rodent_exclusion",
    });

    expect(jobQuery.calls).toContainEqual(["eq", ["id", "job-1"]]);
    expect(jobQuery.calls[0][0]).toBe("update");
    expect(jobQuery.calls[0][1]).toEqual([
      expect.objectContaining({
        job_purpose: "project_phase",
        service_cadence: "project",
        service_family: "rodent_attic",
        service_offering_id: "rodent_exclusion",
      }),
    ]);
  });

  it("updates an assigned technician job status with an authenticated client", async () => {
    const jobQuery = new MockQuery({
      data: { ...job, assigned_tech_id: "technician-1", status: "in_progress" },
      error: null,
    });
    const clientRpc = vi.fn().mockReturnValue(jobQuery);
    const client = { rpc: clientRpc } as never;

    const updated = await updateAssignedTechnicianJobStatusRecord(
      client,
      "job-1",
      "in_progress",
      "en_route",
    );

    expect(updated.status).toBe("in_progress");
    expect(clientRpc).toHaveBeenCalledWith("update_assigned_job_status", {
      p_expected_previous_status: "en_route",
      p_job_id: "job-1",
      p_next_status: "in_progress",
    });
    expect(jobQuery.calls).toContainEqual([
      "select",
      ["*, customer:customers(*), location:locations(*), assigned_technician:profiles(*)"],
    ]);
  });

  it("requires previous status before updating an assigned technician job", async () => {
    const clientRpc = vi.fn();
    const client = { rpc: clientRpc } as never;

    await expect(
      updateAssignedTechnicianJobStatusRecord(
        client,
        "job-1",
        "in_progress",
      ),
    ).rejects.toThrow("Previous job status is required");

    expect(clientRpc).not.toHaveBeenCalled();
  });

  it("cancels a job", async () => {
    const jobQuery = new MockQuery({
      data: { ...job, status: "canceled" },
      error: null,
    });
    from.mockReturnValue(jobQuery as never);

    const canceled = await cancelJobRecord("job-1");

    expect(canceled.status).toBe("canceled");
    expect(jobQuery.calls[0]).toEqual(["update", [{ status: "canceled" }]]);
  });

  it("lists technician profiles", async () => {
    const profilesQuery = new MockQuery({
      data: [{ id: "technician-1", role: "technician", created_at: now, updated_at: now }],
      error: null,
    });
    from.mockReturnValue(profilesQuery as never);

    const technicians = await listTechnicianProfiles();

    expect(technicians).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(profilesQuery.calls).toContainEqual(["eq", ["role", "technician"]]);
  });
});
