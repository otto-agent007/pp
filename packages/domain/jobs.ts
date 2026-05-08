import {
  cancelJobRecord,
  createJobRecord,
  listAssignedTechnicianJobRecords,
  listCustomerPortalJobRecords,
  listJobRecords,
  listTechnicianProfileRecords,
  updateJobRecord,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
import type { Job, JobInput, JobStatus, OfflineQueueItem } from "@pest-patrol/types";

import { buildMobileJobWorkPlan } from "./demoReadiness";
import type { MobileJobWorkPlanItem } from "./demoReadiness";
import { getOfflineQueueJobTriage } from "./offlineQueue";
import type { OfflineQueueJobTriage } from "./offlineQueue";

export type JobStatusFilter = JobStatus | "all";
export type TechnicianFilter = "all" | "unassigned" | string;

export interface DispatchCalendarDay {
  date: string;
  label: string;
  jobs: Job[];
}

export interface MobileDailyJobs {
  date: string;
  jobs: Job[];
}

export interface MobileRouteTimelineSummary {
  label: string;
  syncLabel: string;
  title: string;
}

export interface MobileRouteTimelineJob {
  job: Job;
  readinessLabel: string;
  sectionLabel: "Current job" | "Later today" | "Next job";
  syncTriage: OfflineQueueJobTriage;
  workPlan: MobileJobWorkPlanItem[];
}

export interface MobileDailyRouteTimeline {
  current: MobileRouteTimelineJob | null;
  date: string;
  later: MobileRouteTimelineJob[];
  next: MobileRouteTimelineJob | null;
  summary: MobileRouteTimelineSummary;
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

function requireScheduledStart(value: string) {
  const scheduledStart = requireNonEmpty(value, "Scheduled start");

  if (Number.isNaN(Date.parse(scheduledStart))) {
    throw new Error("Scheduled start must be a valid date");
  }

  return scheduledStart;
}

function normalizeScheduledEnd(value?: string | null) {
  const scheduledEnd = normalizeOptional(value);

  if (scheduledEnd && Number.isNaN(Date.parse(scheduledEnd))) {
    throw new Error("Scheduled end must be a valid date");
  }

  return scheduledEnd;
}

export function normalizeJobInput(input: JobInput): JobInput {
  const scheduledStart = requireScheduledStart(input.scheduled_start);
  const scheduledEnd = normalizeScheduledEnd(input.scheduled_end);

  if (scheduledEnd && Date.parse(scheduledEnd) < Date.parse(scheduledStart)) {
    throw new Error("Scheduled end must be after scheduled start");
  }

  return {
    customer_id: requireNonEmpty(input.customer_id, "Customer"),
    location_id: requireNonEmpty(input.location_id, "Location"),
    assigned_tech_id: normalizeOptional(input.assigned_tech_id),
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    status: input.status ?? "scheduled",
    service_notes: normalizeOptional(input.service_notes),
  };
}

export function validateJobInput(input: JobInput) {
  return normalizeJobInput(input);
}

export function filterJobs(
  jobs: Job[],
  search: string,
  status: JobStatusFilter,
  dateFrom?: string,
  dateTo?: string,
) {
  const query = search.trim().toLowerCase();
  const fromTime = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
  const toTime = dateTo ? Date.parse(`${dateTo}T23:59:59.999`) : null;

  return jobs.filter((job) => {
    if (status !== "all" && job.status !== status) {
      return false;
    }

    const scheduledTime = Date.parse(job.scheduled_start);

    if (fromTime && scheduledTime < fromTime) {
      return false;
    }

    if (toTime && scheduledTime > toTime) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      job.customer?.name,
      job.location?.address,
      job.service_notes,
      job.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getDispatchWeekStart(anchorDate: string) {
  const date = parseDateOnly(anchorDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());

  return toDateKey(date);
}

export function getRelativeDispatchWeek(anchorDate: string, weekOffset: number) {
  const date = parseDateOnly(getDispatchWeekStart(anchorDate));
  date.setDate(date.getDate() + weekOffset * 7);

  return toDateKey(date);
}

export function buildDispatchWeek(
  jobs: Job[],
  anchorDate: string,
  status: JobStatusFilter = "all",
  technician: TechnicianFilter = "all",
): DispatchCalendarDay[] {
  const weekStart = parseDateOnly(getDispatchWeekStart(anchorDate));
  const filteredJobs = jobs
    .filter((job) => status === "all" || job.status === status)
    .filter((job) => {
      if (technician === "all") {
        return true;
      }

      if (technician === "unassigned") {
        return !job.assigned_tech_id;
      }

      return job.assigned_tech_id === technician;
    })
    .sort((left, right) => Date.parse(left.scheduled_start) - Date.parse(right.scheduled_start));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      label: toDateLabel(date),
      jobs: filteredJobs.filter((job) => toDateKey(new Date(job.scheduled_start)) === dateKey),
    };
  });
}

export function buildMobileDailyJobs(jobs: Job[], date: string): MobileDailyJobs {
  return {
    date,
    jobs: jobs
      .filter((job) => toDateKey(new Date(job.scheduled_start)) === date)
      .sort((left, right) => Date.parse(left.scheduled_start) - Date.parse(right.scheduled_start)),
  };
}

function isCurrentCandidate(job: Job, status: JobStatus) {
  return job.status === status;
}

function isNextCandidate(job: Job) {
  return job.status === "scheduled";
}

function laterJobPriority(job: Job) {
  if (job.status === "completed") {
    return 1;
  }

  if (job.status === "canceled") {
    return 2;
  }

  return 0;
}

function sortLaterTimelineJobs(left: Job, right: Job) {
  const priorityDifference = laterJobPriority(left) - laterJobPriority(right);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return Date.parse(left.scheduled_start) - Date.parse(right.scheduled_start);
}

function getReadinessLabel(workPlan: MobileJobWorkPlanItem[]) {
  const done = workPlan.filter((item) => item.state === "done").length;
  const pending = workPlan.filter((item) => item.state === "pending").length;
  const missing = workPlan.filter((item) => item.state === "missing").length;

  return `${done} done, ${pending} pending, ${missing} missing`;
}

function toTimelineJob(
  job: Job,
  queueItems: OfflineQueueItem[],
  sectionLabel: MobileRouteTimelineJob["sectionLabel"],
): MobileRouteTimelineJob {
  const workPlan = buildMobileJobWorkPlan(job, queueItems);

  return {
    job,
    readinessLabel: getReadinessLabel(workPlan),
    sectionLabel,
    syncTriage: getOfflineQueueJobTriage(queueItems, job.id),
    workPlan,
  };
}

function assignedJobsLabel(count: number) {
  return `${count} ${count === 1 ? "job" : "jobs"} assigned today`;
}

export function buildMobileDailyRouteTimeline(
  jobs: Job[],
  date: string,
  queueItems: OfflineQueueItem[],
): MobileDailyRouteTimeline {
  const dailyJobs = buildMobileDailyJobs(jobs, date).jobs;
  const currentJob =
    dailyJobs.find((job) => isCurrentCandidate(job, "in_progress")) ??
    dailyJobs.find((job) => isCurrentCandidate(job, "en_route")) ??
    dailyJobs.find(isNextCandidate) ??
    null;
  const remainingJobs = dailyJobs.filter((job) => job.id !== currentJob?.id);
  const nextJob = remainingJobs.find(isNextCandidate) ?? null;
  const laterJobs = remainingJobs
    .filter((job) => job.id !== nextJob?.id)
    .sort(sortLaterTimelineJobs);

  return {
    current: currentJob
      ? toTimelineJob(currentJob, queueItems, "Current job")
      : null,
    date,
    later: laterJobs.map((job) => toTimelineJob(job, queueItems, "Later today")),
    next: nextJob ? toTimelineJob(nextJob, queueItems, "Next job") : null,
    summary: {
      label: assignedJobsLabel(dailyJobs.length),
      syncLabel:
        queueItems.length > 0
          ? `${queueItems.length} local ${queueItems.length === 1 ? "item" : "items"} in sync queue`
          : "No local sync work queued",
      title: "Today's route",
    },
  };
}

export function filterAssignedTechnicianJobs(jobs: Job[], technicianId: string) {
  return jobs.filter((job) => job.assigned_tech_id === technicianId);
}

export function jobToInput(job: Job, override: Partial<JobInput> = {}): JobInput {
  return validateJobInput({
    customer_id: job.customer_id,
    location_id: job.location_id,
    assigned_tech_id: job.assigned_tech_id,
    scheduled_start: job.scheduled_start,
    scheduled_end: job.scheduled_end,
    status: job.status,
    service_notes: job.service_notes,
    ...override,
  });
}

export async function changeJobStatus(job: Job, status: JobStatus) {
  return updateJobRecord(job.id, jobToInput(job, { status }));
}

export async function assignJobTechnician(job: Job, assignedTechId?: string | null) {
  return updateJobRecord(
    job.id,
    jobToInput(job, { assigned_tech_id: normalizeOptional(assignedTechId) }),
  );
}

export async function listJobs() {
  return listJobRecords();
}

export async function listAssignedTechnicianJobs(client: AuthSupabaseClient) {
  return listAssignedTechnicianJobRecords(client);
}

export async function listCustomerPortalJobs(customerId: string) {
  return listCustomerPortalJobRecords(requireNonEmpty(customerId, "Customer"));
}

export async function createJob(input: JobInput) {
  return createJobRecord(validateJobInput(input));
}

export async function updateJob(id: string, input: JobInput) {
  return updateJobRecord(id, validateJobInput(input));
}

export async function cancelJob(id: string) {
  return cancelJobRecord(id);
}

export async function listTechnicians() {
  return listTechnicianProfileRecords("active");
}
