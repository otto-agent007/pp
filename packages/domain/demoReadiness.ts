import type { JobStatus, OfflineQueueAction, OfflineQueueItem } from "@pest-patrol/types";

export interface DemoWorkflowStep {
  action: string;
  href: string;
  id: "closeout" | "customer" | "dispatch" | "follow-up" | "job";
  label: string;
  routeLabel: string;
  successSignal: string;
  summary: string;
}

export interface MobileTechnicianReadinessInput {
  assignedJobCount: number;
  profileId?: string | null;
}

export interface MobileTechnicianReadinessPanel {
  assignedJobsLabel: string;
  demoNextLabel: string;
  demoNextSummary: string;
  identityLabel: string;
  title: string;
}

export type MobileJobWorkPlanState = "done" | "missing" | "pending";

export interface MobileJobWorkPlanItem {
  id: "chemical" | "form" | "geofence" | "photo" | "signature" | "status";
  label: string;
  state: MobileJobWorkPlanState;
  summary: string;
}

export interface MobileCompletionReadinessGuard {
  label: string;
  missingLabels: string[];
  pendingLabels: string[];
  ready: boolean;
  summary: string;
}

const demoWorkflowSteps: DemoWorkflowStep[] = [
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
    action:
      "Schedule work for the customer location and assign a technician when available.",
    href: "/jobs",
    id: "job",
    label: "Schedule a job",
    routeLabel: "Jobs",
    successSignal:
      "Scheduled job saves and keeps the selected customer/location pairing.",
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
    action:
      "Create billing or share portal access once the job is ready for follow-up.",
    href: "/payments",
    id: "follow-up",
    label: "Finish billing and portal follow-up",
    routeLabel: "Payments",
    successSignal:
      "Payments and portal paths load without exposing provider secrets.",
    summary: "Generate billing or share the customer portal when ready.",
  },
];

export function getDemoWorkflowSteps() {
  return demoWorkflowSteps;
}

export function buildMobileTechnicianReadinessPanel(
  input: MobileTechnicianReadinessInput,
): MobileTechnicianReadinessPanel {
  const assignedJobCount = Math.max(0, Math.floor(input.assignedJobCount));
  const jobNoun = assignedJobCount === 1 ? "job" : "jobs";
  const technicianLabel = input.profileId?.trim().slice(0, 15) || "technician";

  return {
    assignedJobsLabel: `${assignedJobCount} ${jobNoun} assigned today`,
    demoNextLabel: "Demo next",
    demoNextSummary:
      "Open the first assigned job, capture treatment notes, then explain queued sync.",
    identityLabel: `Signed in as ${technicianLabel}`,
    title: "Technician ready",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function queueItemMatchesJob(item: OfflineQueueItem, jobId: string) {
  return isRecord(item.payload) && item.payload.job_id === jobId;
}

function queueCaptureState(
  items: OfflineQueueItem[],
  jobId: string,
  action: OfflineQueueAction,
) {
  const matchingItems = items.filter(
    (item) => item.action === action && queueItemMatchesJob(item, jobId),
  );

  if (matchingItems.some((item) => item.status === "synced")) {
    return "done";
  }

  return matchingItems.length > 0 ? "pending" : "missing";
}

function captureSummary(
  state: MobileJobWorkPlanState,
  labels: { done: string; missing: string; pending: string },
) {
  return labels[state];
}

function joinLowerLabels(labels: string[]) {
  const lowered = labels.map((label) => label.toLowerCase());

  if (lowered.length === 0) {
    return "";
  }

  if (lowered.length === 1) {
    return lowered[0];
  }

  if (lowered.length === 2) {
    return `${lowered[0]} and ${lowered[1]}`;
  }

  return `${lowered.slice(0, -1).join(", ")}, and ${lowered[lowered.length - 1]}`;
}

function statusSummary(status: JobStatus) {
  const labels: Record<JobStatus, string> = {
    scheduled: "Job is scheduled.",
    en_route: "Technician is en route.",
    in_progress: "Job is in progress.",
    completed: "Job is completed.",
    canceled: "Job is canceled.",
  };

  return labels[status];
}

export function buildMobileJobWorkPlan(
  job: { id: string; status: JobStatus },
  items: OfflineQueueItem[],
): MobileJobWorkPlanItem[] {
  const statusState =
    job.status === "en_route" ||
    job.status === "in_progress" ||
    job.status === "completed"
      ? "done"
      : "missing";
  const geofenceState = queueCaptureState(items, job.id, "geofence_event_create");
  const chemicalState = queueCaptureState(items, job.id, "chemical_log_create");
  const photoState = queueCaptureState(items, job.id, "photo_upload");
  const signatureState = queueCaptureState(items, job.id, "signature_capture");
  const formState = queueCaptureState(items, job.id, "form_submission_create");

  return [
    {
      id: "status",
      label: "Start or complete job",
      state: statusState,
      summary: statusSummary(job.status),
    },
    {
      id: "geofence",
      label: "Capture arrival/departure",
      state: geofenceState,
      summary: captureSummary(geofenceState, {
        done: "Geofence event has synced.",
        missing: "No geofence event queued yet.",
        pending: "Geofence event is queued for sync.",
      }),
    },
    {
      id: "chemical",
      label: "Log chemicals",
      state: chemicalState,
      summary: captureSummary(chemicalState, {
        done: "Chemical log has synced.",
        missing: "No chemical log queued yet.",
        pending: "Chemical log is queued for sync.",
      }),
    },
    {
      id: "photo",
      label: "Capture photos",
      state: photoState,
      summary: captureSummary(photoState, {
        done: "Photo capture has synced.",
        missing: "No photo queued yet.",
        pending: "Photo capture is queued for sync.",
      }),
    },
    {
      id: "signature",
      label: "Capture signature",
      state: signatureState,
      summary: captureSummary(signatureState, {
        done: "Signature has synced.",
        missing: "No signature queued yet.",
        pending: "Signature is queued for sync.",
      }),
    },
    {
      id: "form",
      label: "Submit treatment form",
      state: formState,
      summary: captureSummary(formState, {
        done: "Treatment form has synced.",
        missing: "No treatment form queued yet.",
        pending: "Treatment form is queued for sync.",
      }),
    },
  ];
}

export function getMobileCompletionReadinessGuard(
  workPlan: MobileJobWorkPlanItem[],
): MobileCompletionReadinessGuard {
  const captureItems = workPlan.filter((item) => item.id !== "status");
  const missingLabels = captureItems
    .filter((item) => item.state === "missing")
    .map((item) => item.label);
  const pendingLabels = captureItems
    .filter((item) => item.state === "pending")
    .map((item) => item.label);
  const ready = missingLabels.length === 0 && pendingLabels.length === 0;

  if (ready) {
    return {
      label: "Ready to complete",
      missingLabels,
      pendingLabels,
      ready,
      summary: "All required field captures are synced or complete.",
    };
  }

  return {
    label: "Review before completing",
    missingLabels,
    pendingLabels,
    ready,
    summary: [
      missingLabels.length > 0
        ? `Missing ${joinLowerLabels(missingLabels)}.`
        : null,
      pendingLabels.length > 0
        ? `Pending sync for ${joinLowerLabels(pendingLabels)}.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
