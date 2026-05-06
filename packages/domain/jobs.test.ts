import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  buildMobileDailyJobs,
  buildDispatchWeek,
  filterAssignedTechnicianJobs,
  filterJobs,
  getDispatchWeekStart,
  getRelativeDispatchWeek,
  validateJobInput,
} from "./jobs";

const validInput = {
  customer_id: " customer-1 ",
  location_id: " location-1 ",
  assigned_tech_id: "",
  scheduled_start: "2026-05-06T09:00",
  scheduled_end: "",
  service_notes: "  Bring bait stations ",
};

const now = "2026-05-05T00:00:00Z";

describe("job domain", () => {
  it("rejects a missing customer", () => {
    expect(() =>
      validateJobInput({ ...validInput, customer_id: " " }),
    ).toThrow("Customer is required");
  });

  it("rejects a missing location", () => {
    expect(() =>
      validateJobInput({ ...validInput, location_id: " " }),
    ).toThrow("Location is required");
  });

  it("rejects a missing scheduled start", () => {
    expect(() =>
      validateJobInput({ ...validInput, scheduled_start: " " }),
    ).toThrow("Scheduled start is required");
  });

  it("accepts optional technician and service notes", () => {
    const result = validateJobInput({
      ...validInput,
      assigned_tech_id: " technician-1 ",
    });

    expect(result).toMatchObject({
      customer_id: "customer-1",
      location_id: "location-1",
      assigned_tech_id: "technician-1",
      scheduled_start: "2026-05-06T09:00",
      scheduled_end: null,
      status: "scheduled",
      service_notes: "Bring bait stations",
    });
  });

  it("filters by search, status, and date range", () => {
    const jobs = [
      {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T09:00:00Z",
        scheduled_end: null,
        status: "scheduled",
        service_notes: "Interior treatment",
        created_at: now,
        updated_at: now,
        customer: {
          id: "customer-1",
          name: "Apex Homes",
          phone: null,
          email: null,
          property_type: "residential",
          service_notes: null,
          status: "active",
          created_at: now,
          updated_at: now,
        },
        location: {
          id: "location-1",
          customer_id: "customer-1",
          address: "10 Pine Street",
          nickname: null,
          service_notes: null,
          is_primary: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: "job-2",
        customer_id: "customer-2",
        location_id: "location-2",
        assigned_tech_id: null,
        scheduled_start: "2026-05-08T09:00:00Z",
        scheduled_end: null,
        status: "canceled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    expect(filterJobs(jobs, "pine", "scheduled", "2026-05-06", "2026-05-06"))
      .toHaveLength(1);
    expect(filterJobs(jobs, "", "canceled")).toHaveLength(1);
  });

  it("groups dispatch jobs into a navigable week", () => {
    const jobs = [
      {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T09:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-2",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T08:00:00",
        scheduled_end: null,
        status: "completed",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    const week = buildDispatchWeek(jobs, "2026-05-06", "scheduled", "technician-1");

    expect(getDispatchWeekStart("2026-05-06")).toBe("2026-05-03");
    expect(getRelativeDispatchWeek("2026-05-06", 1)).toBe("2026-05-10");
    expect(week).toHaveLength(7);
    expect(week.find((day) => day.date === "2026-05-06")?.jobs).toHaveLength(1);
    expect(week.find((day) => day.date === "2026-05-06")?.jobs[0].id).toBe("job-1");
  });

  it("builds the mobile daily job list for assigned jobs", () => {
    const jobs = [
      {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T10:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-2",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T08:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-3",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-2",
        scheduled_start: "2026-05-06T09:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];
    const assigned = filterAssignedTechnicianJobs(jobs, "technician-1");
    const dailyJobs = buildMobileDailyJobs(assigned, "2026-05-06");

    expect(assigned).toHaveLength(2);
    expect(dailyJobs.jobs.map((job) => job.id)).toEqual(["job-2", "job-1"]);
  });
});
