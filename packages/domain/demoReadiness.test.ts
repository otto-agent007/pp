import { describe, expect, it } from "vitest";

import {
  buildMobileJobWorkPlan,
  buildMobileTechnicianReadinessPanel,
  getMobileCompletionReadinessGuard,
  getDemoWorkflowSteps,
} from "./demoReadiness";

describe("demo readiness domain", () => {
  it("returns the ordered customer-to-closeout demo workflow", () => {
    expect(getDemoWorkflowSteps()).toEqual([
      {
        action: "Add the customer, primary contact, and first service address.",
        href: "/customers",
        id: "customer",
        label: "Create customer and location",
        routeLabel: "Customers",
        successSignal: "Customer appears active with at least one active location.",
        summary: "Add the property, contact, and first service location.",
      },
      {
        action: "Schedule work for the customer location and assign a technician when available.",
        href: "/jobs",
        id: "job",
        label: "Schedule a job",
        routeLabel: "Jobs",
        successSignal: "Scheduled job saves and keeps the selected customer/location pairing.",
        summary: "Connect the customer to an active location and start time.",
      },
      {
        action: "Confirm the scheduled job is visible in the dispatch board.",
        href: "/dispatch",
        id: "dispatch",
        label: "Review dispatch",
        routeLabel: "Dispatch",
        successSignal: "Dispatch shows the job in the expected schedule window.",
        summary: "Confirm the scheduled job appears on the operations board.",
      },
      {
        action: "Open the closeout queue after field work is completed.",
        href: "/closeouts",
        id: "closeout",
        label: "Review closeout",
        routeLabel: "Closeouts",
        successSignal: "Completed jobs can be reviewed with submitted field captures.",
        summary: "Check field captures after the technician completes work.",
      },
      {
        action: "Create billing or share portal access once the job is ready for follow-up.",
        href: "/payments",
        id: "follow-up",
        label: "Finish billing and portal follow-up",
        routeLabel: "Payments",
        successSignal: "Payments and portal paths load without exposing provider secrets.",
        summary: "Generate billing or share the customer portal when ready.",
      },
    ]);
  });

  it("builds compact mobile technician readiness copy for assigned jobs", () => {
    expect(
      buildMobileTechnicianReadinessPanel({
        assignedJobCount: 3,
        profileId: "technician-demo-123456",
      }),
    ).toEqual({
      assignedJobsLabel: "3 jobs assigned today",
      demoNextLabel: "Demo next",
      demoNextSummary: "Open the first assigned job, capture treatment notes, then explain queued sync.",
      identityLabel: "Signed in as technician-demo",
      title: "Technician ready",
    });
  });

  it("summarizes mobile field work plan progress from job status and queued captures", () => {
    const plan = buildMobileJobWorkPlan(
      { id: "job-1", status: "in_progress" },
      [
        {
          id: "queue-1",
          action: "chemical_log_create",
          payload: { job_id: "job-1" },
          status: "queued",
          attempts: 0,
          created_at: "2026-05-05T12:00:00.000Z",
          updated_at: "2026-05-05T12:00:00.000Z",
          next_retry_at: null,
          last_error: null,
        },
        {
          id: "queue-2",
          action: "photo_upload",
          payload: { job_id: "job-1" },
          status: "synced",
          attempts: 1,
          created_at: "2026-05-05T12:00:00.000Z",
          updated_at: "2026-05-05T12:05:00.000Z",
          next_retry_at: null,
          last_error: null,
        },
        {
          id: "queue-3",
          action: "signature_capture",
          payload: { job_id: "other-job" },
          status: "queued",
          attempts: 0,
          created_at: "2026-05-05T12:00:00.000Z",
          updated_at: "2026-05-05T12:00:00.000Z",
          next_retry_at: null,
          last_error: null,
        },
      ],
    );

    expect(plan).toEqual([
      {
        id: "status",
        label: "Start or complete job",
        state: "done",
        summary: "Job is in progress.",
      },
      {
        id: "geofence",
        label: "Capture arrival/departure",
        state: "missing",
        summary: "No geofence event queued yet.",
      },
      {
        id: "chemical",
        label: "Log chemicals",
        state: "pending",
        summary: "Chemical log is queued for sync.",
      },
      {
        id: "photo",
        label: "Capture photos",
        state: "done",
        summary: "Photo capture has synced.",
      },
      {
        id: "signature",
        label: "Capture signature",
        state: "missing",
        summary: "No signature queued yet.",
      },
      {
        id: "form",
        label: "Submit treatment form",
        state: "missing",
        summary: "No treatment form queued yet.",
      },
    ]);
  });

  it("warns before mobile completion when required captures are missing or pending", () => {
    const plan = buildMobileJobWorkPlan(
      { id: "job-1", status: "in_progress" },
      [
        {
          id: "queue-1",
          action: "form_submission_create",
          payload: { job_id: "job-1" },
          status: "queued",
          attempts: 0,
          created_at: "2026-05-05T12:00:00.000Z",
          updated_at: "2026-05-05T12:00:00.000Z",
          next_retry_at: null,
          last_error: null,
        },
      ],
    );

    expect(getMobileCompletionReadinessGuard(plan)).toEqual({
      failedLabels: [],
      label: "Review before completing",
      missingLabels: [
        "Capture arrival/departure",
        "Log chemicals",
        "Capture photos",
        "Capture signature",
      ],
      pendingLabels: ["Submit treatment form"],
      ready: false,
      summary:
        "Missing capture arrival/departure, log chemicals, capture photos, and capture signature. Pending sync for submit treatment form.",
    });
  });

  it("separates failed mobile captures from pending sync work", () => {
    const plan = buildMobileJobWorkPlan(
      { id: "job-1", status: "in_progress" },
      [
        {
          id: "queue-1",
          action: "photo_upload",
          payload: { job_id: "job-1" },
          status: "failed",
          attempts: 2,
          created_at: "2026-05-05T12:00:00.000Z",
          updated_at: "2026-05-05T12:05:00.000Z",
          next_retry_at: "2026-05-05T12:10:00.000Z",
          last_error: "Upload failed",
        },
      ],
    );

    expect(plan.find((item) => item.id === "photo")).toMatchObject({
      state: "failed",
      summary: "Photo capture needs retry.",
    });
    expect(getMobileCompletionReadinessGuard(plan)).toMatchObject({
      failedLabels: ["Capture photos"],
      label: "Review before completing",
      ready: false,
      summary: expect.stringContaining(
        "Retry failed capture photos before closeout.",
      ),
    });
  });

  it("allows mobile completion without warning when captures are done", () => {
    expect(
      getMobileCompletionReadinessGuard([
        {
          id: "status",
          label: "Start or complete job",
          state: "done",
          summary: "Job is in progress.",
        },
        {
          id: "geofence",
          label: "Capture arrival/departure",
          state: "done",
          summary: "Geofence event has synced.",
        },
        {
          id: "chemical",
          label: "Log chemicals",
          state: "done",
          summary: "Chemical log has synced.",
        },
        {
          id: "photo",
          label: "Capture photos",
          state: "done",
          summary: "Photo capture has synced.",
        },
        {
          id: "signature",
          label: "Capture signature",
          state: "done",
          summary: "Signature has synced.",
        },
        {
          id: "form",
          label: "Submit treatment form",
          state: "done",
          summary: "Treatment form has synced.",
        },
      ]),
    ).toEqual({
      failedLabels: [],
      label: "Ready to complete",
      missingLabels: [],
      pendingLabels: [],
      ready: true,
      summary: "All required field captures are synced or complete.",
    });
  });
});
