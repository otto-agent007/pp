import type {
  Job,
  JobStatus,
  TechnicianInviteInput,
  TechnicianProfile,
} from "@pest-patrol/types";
import { getJobScheduleDateKey, getJobScheduleTime } from "./jobs";

export type TechnicianRouteStatus =
  | "completed"
  | "en_route"
  | "idle"
  | "in_progress"
  | "scheduled";

export interface TechnicianRouteLoadSummary {
  current_job_id: string | null;
  route_status: TechnicianRouteStatus;
  route_status_label: string;
  technician_id: string;
  today_assigned_job_count: number;
  upcoming_assigned_job_count: number;
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeEmail(value: string) {
  const email = requireNonEmpty(value, "Technician email").toLowerCase();

  if (!email.includes("@")) {
    throw new Error("Technician email must be valid");
  }

  return email;
}

export function normalizeTechnicianInviteInput(
  input: TechnicianInviteInput,
): TechnicianInviteInput {
  return {
    email: normalizeEmail(input.email),
    display_name: normalizeOptional(input.display_name),
  };
}

export function validateTechnicianInviteInput(input: TechnicianInviteInput) {
  return normalizeTechnicianInviteInput(input);
}

export function getTechnicianLabel(
  technician: Pick<TechnicianProfile, "display_name" | "email" | "id">,
) {
  return (
    technician.display_name ||
    technician.email ||
    `Technician ${technician.id.slice(0, 8)}`
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function jobDateKey(job: Pick<Job, "scheduled_start">) {
  return getJobScheduleDateKey(job.scheduled_start);
}

function sortByScheduledStart(left: Job, right: Job) {
  return (
    getJobScheduleTime(left.scheduled_start) -
    getJobScheduleTime(right.scheduled_start)
  );
}

function routeStatusPriority(status: JobStatus) {
  if (status === "in_progress") {
    return 0;
  }

  if (status === "en_route") {
    return 1;
  }

  if (status === "scheduled") {
    return 2;
  }

  return 3;
}

function getRouteStatus(todayJobs: Job[]): {
  currentJobId: string | null;
  label: string;
  status: TechnicianRouteStatus;
} {
  if (todayJobs.length === 0) {
    return {
      currentJobId: null,
      label: "No route today",
      status: "idle",
    };
  }

  const currentJob =
    [...todayJobs]
      .sort((left, right) => {
        const priority =
          routeStatusPriority(left.status) - routeStatusPriority(right.status);

        return priority || sortByScheduledStart(left, right);
      })
      .find((job) => job.status !== "completed") ?? null;

  if (!currentJob) {
    return {
      currentJobId: null,
      label: "Route complete",
      status: "completed",
    };
  }

  if (
    currentJob.status !== "en_route" &&
    currentJob.status !== "in_progress" &&
    currentJob.status !== "scheduled"
  ) {
    return {
      currentJobId: null,
      label: "Route complete",
      status: "completed",
    };
  }

  return {
    currentJobId: currentJob.id,
    label:
      currentJob.status === "in_progress"
        ? "In progress"
        : currentJob.status === "en_route"
          ? "En route"
          : "Scheduled",
    status: currentJob.status,
  };
}

export function buildTechnicianRouteLoadSummaries(
  technicians: readonly Pick<TechnicianProfile, "id">[],
  jobs: readonly Job[],
  date = toDateKey(new Date()),
): TechnicianRouteLoadSummary[] {
  const activeJobs = jobs.filter((job) => job.status !== "canceled");

  return technicians.map((technician) => {
    const assignedJobs = activeJobs.filter(
      (job) => job.assigned_tech_id === technician.id,
    );
    const todayJobs = assignedJobs
      .filter((job) => jobDateKey(job) === date)
      .sort(sortByScheduledStart);
    const upcomingJobs = assignedJobs.filter((job) => jobDateKey(job) > date);
    const routeStatus = getRouteStatus(todayJobs);

    return {
      technician_id: technician.id,
      today_assigned_job_count: todayJobs.length,
      upcoming_assigned_job_count: upcomingJobs.length,
      route_status: routeStatus.status,
      route_status_label: routeStatus.label,
      current_job_id: routeStatus.currentJobId,
    };
  });
}
