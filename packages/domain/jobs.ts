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
import { buildDispatchLocationMapUrl } from "./geofencing";
import type { DispatchLocationEvidenceByJob } from "./geofencing";
import { getOfflineQueueJobTriage } from "./offlineQueue";
import type { OfflineQueueJobTriage } from "./offlineQueue";

export type JobStatusFilter = JobStatus | "all";
export type TechnicianFilter = "all" | "unassigned" | string;

export interface DispatchCalendarDay {
  date: string;
  label: string;
  jobs: Job[];
}

export type DispatchRouteLocationState =
  | "missing_coordinates"
  | "missing_location"
  | "ready";

export type DispatchRouteStopStatusState = "active" | "canceled" | "completed";
export type DispatchRouteEvidenceState = "complete" | "missing" | "partial";
export type DispatchRouteRiskState = "at_risk" | "closed" | "on_track";
export type DispatchRouteTriageFilter =
  | "all"
  | "at_risk"
  | "missing_coordinates"
  | "missing_evidence"
  | "unassigned";

export interface DispatchRouteStop {
  address_label: string;
  customer_label: string;
  evidence_state: DispatchRouteEvidenceState;
  job: Job;
  location_map_url: string | null;
  location_state: DispatchRouteLocationState;
  next_stop_job_id: string | null;
  risk_state: DispatchRouteRiskState;
  schedule_label: string;
  sequence: number;
  status_state: DispatchRouteStopStatusState;
  technician_id: string | null;
  triage_labels: string[];
}

export interface DispatchRouteIntelligenceSummary {
  active_stops: number;
  at_risk_stops: number;
  canceled_stops: number;
  completed_stops: number;
  missing_coordinates_count: number;
  missing_evidence_count: number;
  missing_location_count: number;
  provider_label: "Provider-free scheduled order";
  total_stops: number;
  unassigned_stops: number;
}

export interface DispatchRouteIntelligence {
  date: string;
  stops: DispatchRouteStop[];
  summary: DispatchRouteIntelligenceSummary;
  technician_id: TechnicianFilter;
}

export interface DispatchRouteIntelligenceOptions {
  evidenceByJob?: DispatchLocationEvidenceByJob;
  now?: Date | string;
}

export interface DispatchRouteGroupDaySummary {
  active_stops: number;
  canceled_stops: number;
  completed_stops: number;
  date: string;
  gps_evidence_count: number;
  label: string;
  missing_coordinates_count: number;
  missing_location_count: number;
  total_stops: number;
  unassigned_stops: number;
}

export interface DispatchRouteGroupSummary
  extends Omit<DispatchRouteGroupDaySummary, "date" | "label"> {
  days: DispatchRouteGroupDaySummary[];
  id: string;
  label: string;
  technician_id: string | null;
}

export interface DispatchRouteGroupSummaryOptions {
  evidenceByJob?: DispatchLocationEvidenceByJob;
  technicianLabels?: Record<string, string>;
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

const scheduleDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

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

  if (Number.isNaN(getJobScheduleTime(scheduledStart))) {
    throw new Error("Scheduled start must be a valid date");
  }

  return scheduledStart;
}

function normalizeScheduledEnd(value?: string | null) {
  const scheduledEnd = normalizeOptional(value);

  if (scheduledEnd && Number.isNaN(getJobScheduleTime(scheduledEnd))) {
    throw new Error("Scheduled end must be a valid date");
  }

  return scheduledEnd;
}

export function normalizeJobInput(input: JobInput): JobInput {
  const scheduledStart = requireScheduledStart(input.scheduled_start);
  const scheduledEnd = normalizeScheduledEnd(input.scheduled_end);

  if (scheduledEnd && getJobScheduleTime(scheduledEnd) < getJobScheduleTime(scheduledStart)) {
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

export function parseJobScheduleWallTime(value: string) {
  const match = scheduleDateTimePattern.exec(value.trim());

  if (match) {
    const [, year, month, day, hour, minute, second = "0"] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  return new Date(value);
}

export function getJobScheduleTime(value: string) {
  return parseJobScheduleWallTime(value).getTime();
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

    const scheduledTime = getJobScheduleTime(job.scheduled_start);

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

function toTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parseJobScheduleWallTime(value));
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
    .sort((left, right) => getJobScheduleTime(left.scheduled_start) - getJobScheduleTime(right.scheduled_start));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = toDateKey(date);

    return {
      date: dateKey,
      label: toDateLabel(date),
      jobs: filteredJobs.filter((job) => toDateKey(parseJobScheduleWallTime(job.scheduled_start)) === dateKey),
    };
  });
}

function filterDispatchRouteJobs(
  jobs: Job[],
  date: string,
  technician: TechnicianFilter,
) {
  return jobs
    .filter(
      (job) =>
        toDateKey(parseJobScheduleWallTime(job.scheduled_start)) === date,
    )
    .filter((job) => {
      if (technician === "all") {
        return true;
      }

      if (technician === "unassigned") {
        return !job.assigned_tech_id;
      }

      return job.assigned_tech_id === technician;
    })
    .sort(
      (left, right) =>
        getJobScheduleTime(left.scheduled_start) -
        getJobScheduleTime(right.scheduled_start),
    );
}

function getDispatchRouteLocationState(
  job: Job,
): DispatchRouteLocationState {
  if (!job.location) {
    return "missing_location";
  }

  if (
    typeof job.location.latitude !== "number" ||
    typeof job.location.longitude !== "number"
  ) {
    return "missing_coordinates";
  }

  return "ready";
}

function getDispatchRouteStatusState(
  status: JobStatus,
): DispatchRouteStopStatusState {
  if (status === "completed") {
    return "completed";
  }

  if (status === "canceled") {
    return "canceled";
  }

  return "active";
}

function getLocationMapUrl(job: Job) {
  if (
    typeof job.location?.latitude !== "number" ||
    typeof job.location.longitude !== "number"
  ) {
    return null;
  }

  return buildDispatchLocationMapUrl({
    latitude: job.location.latitude,
    longitude: job.location.longitude,
  });
}

function summarizeDispatchRouteStops(
  stops: DispatchRouteStop[],
): DispatchRouteIntelligenceSummary {
  return {
    active_stops: stops.filter((stop) => stop.status_state === "active").length,
    at_risk_stops: stops.filter((stop) => stop.risk_state === "at_risk").length,
    canceled_stops: stops.filter((stop) => stop.status_state === "canceled").length,
    completed_stops: stops.filter((stop) => stop.status_state === "completed").length,
    missing_coordinates_count: stops.filter(
      (stop) => stop.location_state === "missing_coordinates",
    ).length,
    missing_evidence_count: stops.filter(
      (stop) => stop.evidence_state !== "complete",
    ).length,
    missing_location_count: stops.filter(
      (stop) => stop.location_state === "missing_location",
    ).length,
    provider_label: "Provider-free scheduled order",
    total_stops: stops.length,
    unassigned_stops: stops.filter((stop) => !stop.technician_id).length,
  };
}

function getDispatchRouteEvidenceState(
  job: Job,
  evidenceByJob: DispatchLocationEvidenceByJob,
): DispatchRouteEvidenceState {
  const evidence = evidenceByJob[job.id];

  if (evidence?.latest_arrival && evidence.latest_departure) {
    return "complete";
  }

  if (evidence?.latest_arrival || evidence?.latest_departure) {
    return "partial";
  }

  return "missing";
}

function getDispatchRouteRiskState(
  job: Job,
  statusState: DispatchRouteStopStatusState,
  now?: Date | string,
): DispatchRouteRiskState {
  if (statusState !== "active") {
    return "closed";
  }

  if (!now) {
    return "on_track";
  }

  const nowTime = typeof now === "string" ? Date.parse(now) : now.getTime();

  if (Number.isNaN(nowTime)) {
    return "on_track";
  }

  return getJobScheduleTime(job.scheduled_start) < nowTime
    ? "at_risk"
    : "on_track";
}

function getDispatchRouteTriageLabels(stop: {
  evidence_state: DispatchRouteEvidenceState;
  location_state: DispatchRouteLocationState;
  risk_state: DispatchRouteRiskState;
  technician_id: string | null;
}) {
  return [
    stop.technician_id ? null : "Unassigned",
    stop.location_state === "missing_coordinates"
      ? "Missing service coordinates"
      : null,
    stop.location_state === "missing_location" ? "Missing service location" : null,
    stop.evidence_state === "complete" ? null : "Missing GPS evidence",
    stop.risk_state === "at_risk" ? "At risk" : null,
  ].filter((label): label is string => Boolean(label));
}

export function buildDispatchRouteIntelligence(
  jobs: Job[],
  date: string,
  technician: TechnicianFilter = "all",
  options: DispatchRouteIntelligenceOptions = {},
): DispatchRouteIntelligence {
  const routeJobs = filterDispatchRouteJobs(jobs, date, technician);
  const stops = routeJobs.map((job, index): DispatchRouteStop => {
    const statusState = getDispatchRouteStatusState(job.status);
    const stop = {
      address_label: job.location?.address ?? "No location saved",
      customer_label: job.customer?.name ?? "Unknown customer",
      evidence_state: getDispatchRouteEvidenceState(
        job,
        options.evidenceByJob ?? {},
      ),
      job,
      location_map_url: getLocationMapUrl(job),
      location_state: getDispatchRouteLocationState(job),
      next_stop_job_id: routeJobs[index + 1]?.id ?? null,
      risk_state: getDispatchRouteRiskState(job, statusState, options.now),
      schedule_label: toTimeLabel(job.scheduled_start),
      sequence: index + 1,
      status_state: statusState,
      technician_id: job.assigned_tech_id,
    };

    return {
      ...stop,
      triage_labels: getDispatchRouteTriageLabels(stop),
    };
  });

  return {
    date,
    stops,
    summary: summarizeDispatchRouteStops(stops),
    technician_id: technician,
  };
}

export function buildDispatchRouteIntelligenceForDays(
  days: DispatchCalendarDay[],
  technician: TechnicianFilter = "all",
  options: DispatchRouteIntelligenceOptions = {},
): DispatchRouteIntelligence {
  const stops = days
    .flatMap((day) =>
      buildDispatchRouteIntelligence(day.jobs, day.date, technician, options).stops,
    )
    .map((stop, index, allStops) => ({
      ...stop,
      next_stop_job_id: allStops[index + 1]?.job.id ?? null,
      sequence: index + 1,
    }));

  return {
    date: days[0]?.date ?? "",
    stops,
    summary: summarizeDispatchRouteStops(stops),
    technician_id: technician,
  };
}

function emptyDispatchRouteGroupDaySummary(
  day: Pick<DispatchCalendarDay, "date" | "label">,
): DispatchRouteGroupDaySummary {
  return {
    active_stops: 0,
    canceled_stops: 0,
    completed_stops: 0,
    date: day.date,
    gps_evidence_count: 0,
    label: day.label,
    missing_coordinates_count: 0,
    missing_location_count: 0,
    total_stops: 0,
    unassigned_stops: 0,
  };
}

function emptyDispatchRouteGroupSummary(
  id: string,
  label: string,
  technicianId: string | null,
): DispatchRouteGroupSummary {
  return {
    active_stops: 0,
    canceled_stops: 0,
    completed_stops: 0,
    days: [],
    gps_evidence_count: 0,
    id,
    label,
    missing_coordinates_count: 0,
    missing_location_count: 0,
    technician_id: technicianId,
    total_stops: 0,
    unassigned_stops: 0,
  };
}

function addJobToDispatchRouteGroupSummary(
  summary: DispatchRouteGroupDaySummary,
  job: Job,
  evidenceByJob: DispatchLocationEvidenceByJob,
) {
  const statusState = getDispatchRouteStatusState(job.status);
  const locationState = getDispatchRouteLocationState(job);

  summary.total_stops += 1;

  if (statusState === "active") {
    summary.active_stops += 1;
  } else if (statusState === "completed") {
    summary.completed_stops += 1;
  } else {
    summary.canceled_stops += 1;
  }

  if (locationState === "missing_coordinates") {
    summary.missing_coordinates_count += 1;
  } else if (locationState === "missing_location") {
    summary.missing_location_count += 1;
  }

  if (!job.assigned_tech_id) {
    summary.unassigned_stops += 1;
  }

  if (evidenceByJob[job.id]?.state === "captured") {
    summary.gps_evidence_count += 1;
  }
}

function addDayToDispatchRouteGroupSummary(
  group: DispatchRouteGroupSummary,
  day: DispatchRouteGroupDaySummary,
) {
  group.days.push(day);
  group.active_stops += day.active_stops;
  group.canceled_stops += day.canceled_stops;
  group.completed_stops += day.completed_stops;
  group.gps_evidence_count += day.gps_evidence_count;
  group.missing_coordinates_count += day.missing_coordinates_count;
  group.missing_location_count += day.missing_location_count;
  group.total_stops += day.total_stops;
  group.unassigned_stops += day.unassigned_stops;
}

function dispatchRouteGroupLabel(
  technicianId: string | null,
  labels: Record<string, string>,
) {
  if (!technicianId) {
    return "Unassigned";
  }

  return labels[technicianId] ?? `Technician ${technicianId}`;
}

export function buildDispatchRouteGroupSummaries(
  days: DispatchCalendarDay[],
  options: DispatchRouteGroupSummaryOptions = {},
): DispatchRouteGroupSummary[] {
  const evidenceByJob = options.evidenceByJob ?? {};
  const groups = new Map<string, DispatchRouteGroupSummary>();

  for (const day of days) {
    const jobsByTechnician = new Map<string, Job[]>();

    for (const job of day.jobs) {
      const groupId = job.assigned_tech_id ?? "unassigned";
      jobsByTechnician.set(groupId, [...(jobsByTechnician.get(groupId) ?? []), job]);
    }

    for (const [groupId, jobs] of jobsByTechnician.entries()) {
      const technicianId = groupId === "unassigned" ? null : groupId;
      const group =
        groups.get(groupId) ??
        emptyDispatchRouteGroupSummary(
          groupId,
          dispatchRouteGroupLabel(technicianId, options.technicianLabels ?? {}),
          technicianId,
        );
      const daySummary = emptyDispatchRouteGroupDaySummary(day);

      for (const job of jobs) {
        addJobToDispatchRouteGroupSummary(daySummary, job, evidenceByJob);
      }

      addDayToDispatchRouteGroupSummary(group, daySummary);
      groups.set(groupId, group);
    }
  }

  return [...groups.values()].sort((left, right) => {
    if (left.technician_id === null && right.technician_id !== null) {
      return 1;
    }

    if (left.technician_id !== null && right.technician_id === null) {
      return -1;
    }

    return left.label.localeCompare(right.label);
  });
}

export function filterDispatchRouteStops(
  stops: DispatchRouteStop[],
  filter: DispatchRouteTriageFilter,
) {
  if (filter === "all") {
    return stops;
  }

  return stops.filter((stop) => {
    if (filter === "at_risk") {
      return stop.risk_state === "at_risk";
    }

    if (filter === "missing_coordinates") {
      return (
        stop.location_state === "missing_coordinates" ||
        stop.location_state === "missing_location"
      );
    }

    if (filter === "missing_evidence") {
      return stop.evidence_state !== "complete";
    }

    return !stop.technician_id;
  });
}

export function buildMobileDailyJobs(jobs: Job[], date: string): MobileDailyJobs {
  return {
    date,
    jobs: jobs
      .filter((job) => toDateKey(parseJobScheduleWallTime(job.scheduled_start)) === date)
      .sort((left, right) => getJobScheduleTime(left.scheduled_start) - getJobScheduleTime(right.scheduled_start)),
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

  return getJobScheduleTime(left.scheduled_start) - getJobScheduleTime(right.scheduled_start);
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
