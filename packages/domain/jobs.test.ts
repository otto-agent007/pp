import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  buildDispatchRouteGroupSummaries,
  buildDispatchRouteIntelligence,
  buildDispatchRouteIntelligenceForDays,
  buildMobileDailyRouteTimeline,
  buildMobileDailyJobs,
  buildDispatchWeek,
  filterAssignedTechnicianJobs,
  filterJobs,
  getDispatchWeekStart,
  getRelativeDispatchWeek,
  parseJobScheduleWallTime,
  validateJobInput,
} from "./jobs";
import type { OfflineQueueItem } from "@pest-patrol/types";

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

  it("treats scheduled job timestamps as operator-entered wall time", () => {
    const parsed = parseJobScheduleWallTime("2026-05-06T09:38:00Z");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(6);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(38);
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

  it("keeps Z-suffixed scheduled jobs on their wall-clock dispatch day", () => {
    const jobs = [
      {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T09:38:00Z",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    const week = buildDispatchWeek(jobs, "2026-05-06");

    expect(week.find((day) => day.date === "2026-05-06")?.jobs[0]?.id)
      .toBe("job-1");
  });

  it("builds provider-free dispatch route intelligence by technician and readiness", () => {
    const jobs = [
      {
        id: "job-late",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T11:00:00Z",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
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
          latitude: 33.8121,
          longitude: -117.919,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: "job-early",
        customer_id: "customer-1",
        location_id: "location-2",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T08:00:00Z",
        scheduled_end: null,
        status: "completed",
        service_notes: null,
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
          id: "location-2",
          customer_id: "customer-1",
          address: "20 Oak Avenue",
          nickname: null,
          service_notes: null,
          is_primary: false,
          latitude: null,
          longitude: null,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: "job-unassigned",
        customer_id: "customer-2",
        location_id: "location-3",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T09:00:00Z",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-canceled",
        customer_id: "customer-2",
        location_id: "location-3",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T10:00:00Z",
        scheduled_end: null,
        status: "canceled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    const intelligence = buildDispatchRouteIntelligence(
      jobs,
      "2026-05-06",
      "technician-1",
    );

    expect(intelligence.summary).toMatchObject({
      active_stops: 1,
      completed_stops: 1,
      missing_coordinates_count: 1,
      missing_location_count: 1,
      provider_label: "Provider-free scheduled order",
      total_stops: 3,
    });
    expect(intelligence.stops.map((stop) => stop.job.id)).toEqual([
      "job-early",
      "job-canceled",
      "job-late",
    ]);
    expect(intelligence.stops.map((stop) => stop.sequence)).toEqual([1, 2, 3]);
    expect(intelligence.stops[0]).toMatchObject({
      address_label: "20 Oak Avenue",
      location_state: "missing_coordinates",
      next_stop_job_id: "job-canceled",
      status_state: "completed",
    });
    expect(intelligence.stops[1]).toMatchObject({
      address_label: "No location saved",
      location_state: "missing_location",
      next_stop_job_id: "job-late",
      status_state: "canceled",
    });
    expect(intelligence.stops[2]).toMatchObject({
      address_label: "10 Pine Street",
      location_map_url: "https://www.google.com/maps/search/?api=1&query=33.8121%2C-117.919",
      location_state: "ready",
      next_stop_job_id: null,
      schedule_label: "11:00 AM",
      status_state: "active",
    });
  });

  it("summarizes all and unassigned provider-free dispatch routes", () => {
    const jobs = [
      {
        id: "job-assigned",
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
        id: "job-unassigned",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T09:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    expect(
      buildDispatchRouteIntelligence(jobs, "2026-05-06").summary,
    ).toMatchObject({
      active_stops: 2,
      total_stops: 2,
      unassigned_stops: 1,
    });
    expect(
      buildDispatchRouteIntelligence(jobs, "2026-05-06", "unassigned").stops.map(
        (stop) => stop.job.id,
      ),
    ).toEqual(["job-unassigned"]);
  });

  it("builds provider-free route group summaries by technician, day, status, and GPS evidence", () => {
    const jobs = [
      {
        id: "job-ready",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T08:00:00",
        scheduled_end: null,
        status: "completed",
        service_notes: null,
        created_at: now,
        updated_at: now,
        location: {
          id: "location-1",
          customer_id: "customer-1",
          address: "10 Pine Street",
          nickname: null,
          service_notes: null,
          is_primary: true,
          latitude: 33.8121,
          longitude: -117.919,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: "job-unassigned-missing-coordinates",
        customer_id: "customer-1",
        location_id: "location-2",
        assigned_tech_id: null,
        scheduled_start: "2026-05-06T09:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
        location: {
          id: "location-2",
          customer_id: "customer-1",
          address: "20 Oak Avenue",
          nickname: null,
          service_notes: null,
          is_primary: false,
          latitude: null,
          longitude: null,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
      {
        id: "job-missing-location",
        customer_id: "customer-1",
        location_id: "location-missing",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-07T10:00:00",
        scheduled_end: null,
        status: "in_progress",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];
    const days = buildDispatchWeek(jobs, "2026-05-06");

    const intelligence = buildDispatchRouteIntelligenceForDays(days, "all");
    const groups = buildDispatchRouteGroupSummaries(days, {
      evidenceByJob: {
        "job-ready": { state: "captured" },
      },
      technicianLabels: {
        "technician-1": "Testnician",
      },
    });

    expect(intelligence.stops.map((stop) => stop.sequence)).toEqual([1, 2, 3]);
    expect(intelligence.stops.map((stop) => stop.next_stop_job_id)).toEqual([
      "job-unassigned-missing-coordinates",
      "job-missing-location",
      null,
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      active_stops: 1,
      completed_stops: 1,
      gps_evidence_count: 1,
      label: "Testnician",
      missing_coordinates_count: 0,
      missing_location_count: 1,
      technician_id: "technician-1",
      total_stops: 2,
      unassigned_stops: 0,
    });
    expect(groups[0].days.map((day) => day.date)).toEqual([
      "2026-05-06",
      "2026-05-07",
    ]);
    expect(groups[1]).toMatchObject({
      active_stops: 1,
      gps_evidence_count: 0,
      label: "Unassigned",
      missing_coordinates_count: 1,
      missing_location_count: 0,
      technician_id: null,
      total_stops: 1,
      unassigned_stops: 1,
    });
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

  it("builds a status-based mobile route timeline with current, next, and later jobs", () => {
    const jobs = [
      {
        id: "job-scheduled-late",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T14:00:00",
        scheduled_end: null,
        status: "scheduled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-current",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T11:00:00",
        scheduled_end: null,
        status: "in_progress",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-next",
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
        id: "job-completed",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T08:00:00",
        scheduled_end: null,
        status: "completed",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-canceled",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T07:00:00",
        scheduled_end: null,
        status: "canceled",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];

    const timeline = buildMobileDailyRouteTimeline(jobs, "2026-05-06", []);

    expect(timeline.summary.title).toBe("Today's route");
    expect(timeline.summary.label).toBe("5 jobs assigned today");
    expect(timeline.current?.job.id).toBe("job-current");
    expect(timeline.current?.sectionLabel).toBe("Current job");
    expect(timeline.next?.job.id).toBe("job-next");
    expect(timeline.next?.sectionLabel).toBe("Next job");
    expect(timeline.later.map((item) => item.job.id)).toEqual([
      "job-scheduled-late",
      "job-completed",
      "job-canceled",
    ]);
  });

  it("falls back from en route to the next scheduled job and handles empty days", () => {
    const jobs = [
      {
        id: "job-en-route",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T10:00:00",
        scheduled_end: null,
        status: "en_route",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-scheduled",
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
    ] satisfies Job[];

    expect(
      buildMobileDailyRouteTimeline(jobs, "2026-05-06", []).current?.job.id,
    ).toBe("job-en-route");
    expect(
      buildMobileDailyRouteTimeline(
        jobs.map((job) => ({ ...job, status: "scheduled" })),
        "2026-05-06",
        [],
      ).current?.job.id,
    ).toBe("job-scheduled");
    expect(buildMobileDailyRouteTimeline([], "2026-05-06", [])).toMatchObject({
      current: null,
      next: null,
      later: [],
      summary: {
        label: "0 jobs assigned today",
      },
    });
  });

  it("summarizes mobile route capture readiness from the work plan and queue", () => {
    const jobs = [
      {
        id: "job-queued",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        scheduled_start: "2026-05-06T08:00:00",
        scheduled_end: null,
        status: "en_route",
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] satisfies Job[];
    const queueItems = [
      {
        id: "queue-1",
        action: "form_submission_create",
        attempts: 0,
        created_at: now,
        last_error: null,
        next_retry_at: null,
        payload: { job_id: "job-queued", template_id: "template-1", form_data: {} },
        status: "queued",
        updated_at: now,
      },
    ] satisfies OfflineQueueItem[];

    const timeline = buildMobileDailyRouteTimeline(
      jobs,
      "2026-05-06",
      queueItems,
    );

    expect(timeline.current?.readinessLabel).toBe("1 done, 1 pending, 4 missing");
    expect(timeline.current?.syncTriage).toMatchObject({
      label: "1 queued sync item",
      state: "queued",
    });
    expect(timeline.current?.workPlan.find((item) => item.id === "form")).toMatchObject({
      state: "pending",
      summary: "Treatment form is queued for sync.",
    });
  });
});
