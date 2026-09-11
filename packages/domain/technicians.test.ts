import { describe, expect, it } from "vitest";

import type { JobStatus } from "@pest-patrol/types";

import {
  buildTechnicianRouteLoadSummaries,
  canTechnicianSetJobStatus,
  getTechnicianLabel,
  normalizeTechnicianInviteInput,
  technicianJobStatuses,
  validateTechnicianInviteInput,
} from "./technicians";

describe("technician domain", () => {
  it("rejects missing technician email", () => {
    expect(() =>
      validateTechnicianInviteInput({ email: " ", display_name: "Testnician" }),
    ).toThrow("Technician email is required");
  });

  it("rejects invalid technician email", () => {
    expect(() =>
      validateTechnicianInviteInput({
        email: "testnician",
        display_name: null,
      }),
    ).toThrow("Technician email must be valid");
  });

  it("normalizes invite input", () => {
    expect(
      normalizeTechnicianInviteInput({
        email: " TESTNICIAN@EXAMPLE.COM ",
        display_name: " Testnician ",
      }),
    ).toEqual({
      email: "testnician@example.com",
      display_name: "Testnician",
    });
  });

  it("labels technicians by display name, email, then id fallback", () => {
    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: "testnician@example.com",
        display_name: "Testnician",
      }),
    ).toBe("Testnician");

    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: "testnician@example.com",
        display_name: null,
      }),
    ).toBe("testnician@example.com");

    expect(
      getTechnicianLabel({
        id: "technician-123456",
        email: null,
        display_name: null,
      }),
    ).toBe("Technician technici");
  });

  it("builds route-load summaries from assigned jobs", () => {
    const now = "2026-05-07T12:00:00.000Z";
    const technicians = [
      {
        id: "technician-1",
        role: "technician",
        email: "one@example.com",
        display_name: "One",
        status: "active",
        created_at: now,
        updated_at: now,
      },
      {
        id: "technician-2",
        role: "technician",
        email: "two@example.com",
        display_name: "Two",
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ] as const;
    const jobs = [
      {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        status: "scheduled",
        scheduled_start: "2026-05-07T09:00:00.000Z",
        scheduled_end: null,
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-2",
        customer_id: "customer-2",
        location_id: "location-2",
        assigned_tech_id: "technician-1",
        status: "in_progress",
        scheduled_start: "2026-05-07T11:00:00.000Z",
        scheduled_end: null,
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-3",
        customer_id: "customer-3",
        location_id: "location-3",
        assigned_tech_id: "technician-1",
        status: "scheduled",
        scheduled_start: "2026-05-08T09:00:00.000Z",
        scheduled_end: null,
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: "job-4",
        customer_id: "customer-4",
        location_id: "location-4",
        assigned_tech_id: "technician-1",
        status: "canceled",
        scheduled_start: "2026-05-09T09:00:00.000Z",
        scheduled_end: null,
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] as const;

    expect(
      buildTechnicianRouteLoadSummaries(technicians, jobs, "2026-05-07"),
    ).toEqual([
      {
        technician_id: "technician-1",
        today_assigned_job_count: 2,
        upcoming_assigned_job_count: 1,
        route_status: "in_progress",
        route_status_label: "In progress",
        current_job_id: "job-2",
      },
      {
        technician_id: "technician-2",
        today_assigned_job_count: 0,
        upcoming_assigned_job_count: 0,
        route_status: "idle",
        route_status_label: "No route today",
        current_job_id: null,
      },
    ]);
  });

  it("counts Z-suffixed assigned jobs by wall-clock route date", () => {
    const now = "2026-05-07T12:00:00.000Z";
    const technicians = [
      {
        id: "technician-1",
        role: "technician",
        email: "one@example.com",
        display_name: "One",
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ] as const;
    const jobs = [
      {
        id: "job-wall-clock",
        customer_id: "customer-1",
        location_id: "location-1",
        assigned_tech_id: "technician-1",
        status: "scheduled",
        scheduled_start: "2026-05-07T01:30:00Z",
        scheduled_end: null,
        service_notes: null,
        created_at: now,
        updated_at: now,
      },
    ] as const;

    expect(
      buildTechnicianRouteLoadSummaries(technicians, jobs, "2026-05-07"),
    ).toEqual([
      {
        technician_id: "technician-1",
        today_assigned_job_count: 1,
        upcoming_assigned_job_count: 0,
        route_status: "scheduled",
        route_status_label: "Scheduled",
        current_job_id: "job-wall-clock",
      },
    ]);
  });
});

describe("canTechnicianSetJobStatus", () => {
  it("allows every move among the three pre-completion statuses", () => {
    const open: JobStatus[] = ["scheduled", "en_route", "in_progress"];

    for (const currentStatus of open) {
      for (const nextStatus of open) {
        expect(
          canTechnicianSetJobStatus(currentStatus, nextStatus),
          `${currentStatus} -> ${nextStatus}`,
        ).toBe(true);
      }
    }
  });

  it("allows completing from any open status", () => {
    for (const currentStatus of ["scheduled", "en_route", "in_progress"] as const) {
      expect(canTechnicianSetJobStatus(currentStatus, "completed")).toBe(true);
    }
  });

  it("refuses to move a completed job back out", () => {
    for (const nextStatus of ["scheduled", "en_route", "in_progress"] as const) {
      expect(canTechnicianSetJobStatus("completed", nextStatus)).toBe(false);
    }
  });

  it("treats re-asserting completed as allowed, so a queue replay is not a conflict", () => {
    expect(canTechnicianSetJobStatus("completed", "completed")).toBe(true);
  });

  it("refuses statuses outside the technician vocabulary", () => {
    expect(canTechnicianSetJobStatus("canceled", "scheduled")).toBe(false);
    expect(canTechnicianSetJobStatus("in_progress", "canceled")).toBe(false);
  });

  it("lists exactly the statuses the technician RPC accepts", () => {
    expect(technicianJobStatuses).toEqual([
      "scheduled",
      "en_route",
      "in_progress",
      "completed",
    ]);
  });
});
