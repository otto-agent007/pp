"use client";

import {
  buildDispatchLocationEvidenceByJob,
  buildDispatchRouteGroupSummaries,
  buildDispatchRouteIntelligenceForDays,
  buildDispatchWeek,
  filterDispatchRouteStops,
  getTechnicianLabel,
  getDispatchWeekStart,
  getRelativeDispatchWeek,
  parseJobScheduleWallTime,
} from "@pest-patrol/domain";
import type {
  DispatchLocationEvidence,
  DispatchLocationEvidenceEvent,
  DispatchRouteGroupSummary,
  DispatchRouteIntelligence,
  DispatchRouteStop,
  DispatchRouteTriageFilter,
  TechnicianFilter,
} from "@pest-patrol/domain";
import type { Customer, Job, JobStatus } from "@pest-patrol/types";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import {
  useAssignJobTechnician,
  useChangeJobStatus,
  useJobs,
  useTechnicians,
} from "../../hooks/useJobs";

type StatusFilter = JobStatus | "all";
const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};
const triageLabels: Record<DispatchRouteTriageFilter, string> = {
  all: "All dispatch work",
  at_risk: "At risk",
  missing_coordinates: "Missing coordinates",
  missing_evidence: "Missing GPS evidence",
  unassigned: "Unassigned",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function decorateJob(job: Job, customers: Customer[]) {
  const customer = job.customer ?? customers.find((item) => item.id === job.customer_id);
  const location =
    job.location ?? customer?.locations?.find((item) => item.id === job.location_id);

  return {
    ...job,
    customer,
    location,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parseJobScheduleWallTime(value));
}

function formatCapturedTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function gpsEventLabel(eventType: DispatchLocationEvidenceEvent["event_type"]) {
  return eventType === "departure" ? "Departure" : "Arrival";
}

function accuracyLabel(value: number | null) {
  return value === null ? "Accuracy unavailable" : `Accuracy ${Math.round(value)} m`;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function routeStopLocationLabel(stop?: DispatchRouteStop) {
  if (!stop) {
    return "Location readiness unavailable";
  }

  if (stop.location_state === "ready") {
    return "Service coordinates ready";
  }

  if (stop.location_state === "missing_coordinates") {
    return "Missing service coordinates";
  }

  return "Missing service location";
}

function routeStopEvidenceLabel(stop?: DispatchRouteStop) {
  if (!stop) {
    return "GPS evidence unavailable";
  }

  if (stop.evidence_state === "complete") {
    return "Arrival and departure synced";
  }

  if (stop.evidence_state === "partial") {
    return "Partial GPS evidence";
  }

  return "No synced GPS evidence";
}

function routeStopRiskLabel(stop?: DispatchRouteStop) {
  if (!stop || stop.risk_state === "on_track") {
    return "On track";
  }

  if (stop.risk_state === "closed") {
    return "Closed";
  }

  return "At risk";
}

function missingLocationEvidence(jobId: string): DispatchLocationEvidence {
  return {
    job_id: jobId,
    latest_arrival: null,
    latest_departure: null,
    latest_event: null,
    state: "missing",
    summary_label: "No synced GPS evidence yet",
  };
}

function GpsEvidenceEventRow({
  event,
}: {
  event: DispatchLocationEvidenceEvent;
}) {
  const label = gpsEventLabel(event.event_type);

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-neutralDark">{label}</p>
        <a
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          href={event.map_url}
          rel="noreferrer"
          target="_blank"
        >
          Open {label.toLowerCase()} map
        </a>
      </div>
      <p className="mt-1 text-xs text-gray-600">
        {formatCapturedTime(event.captured_at)} - {event.radius_label}
      </p>
      <p className="mt-1 text-xs text-gray-500">{accuracyLabel(event.accuracy_m)}</p>
    </div>
  );
}

function LocationEvidencePanel({
  evidence,
  isLoading,
  jobId,
}: {
  evidence?: DispatchLocationEvidence;
  isLoading: boolean;
  jobId: string;
}) {
  const state = evidence ?? missingLocationEvidence(jobId);
  const events = [state.latest_arrival, state.latest_departure].filter(
    (event): event is DispatchLocationEvidenceEvent => Boolean(event),
  );

  return (
    <section
      aria-label={`GPS evidence for ${jobId}`}
      className="rounded-md border border-blue-100 bg-blue-50/70 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">
          GPS evidence
        </p>
        <p className="text-xs font-semibold text-blue-950">
          {isLoading ? "Loading GPS evidence" : state.summary_label}
        </p>
      </div>
      {events.length > 0 ? (
        <div className="mt-2 space-y-2">
          {events.map((event) => (
            <GpsEvidenceEventRow
              event={event}
              key={`${event.event_type}-${event.captured_at}`}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-600">
          Arrival and departure GPS points will appear here after the technician
          syncs mobile captures.
        </p>
      )}
    </section>
  );
}

function RouteIntelligencePanel({
  intelligence,
  triage,
}: {
  intelligence: DispatchRouteIntelligence;
  triage: DispatchRouteTriageFilter;
}) {
  const summary = intelligence.summary;

  return (
    <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold">Technician daily route companion</p>
          <p className="mt-1">
            Technician mobile routes use the same assigned jobs, status priority,
            and scheduled order shown here.
          </p>
          <p className="mt-1">
            <span>{summary.provider_label}</span>
            <span>
              : no map routing, optimization, or external navigation setup is
              required.
            </span>
          </p>
        </div>
        <div className="grid gap-2 text-xs font-semibold sm:grid-cols-2 lg:min-w-80">
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.total_stops, "stop")}
          </span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.active_stops, "active", "active")}
          </span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.completed_stops, "completed", "completed")}
          </span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.missing_coordinates_count, "missing coordinates", "missing coordinates")}
          </span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.missing_evidence_count, "missing GPS evidence", "missing GPS evidence")}
          </span>
          <span className="rounded-md bg-white px-3 py-2 text-blue-950">
            {plural(summary.at_risk_stops, "at risk", "at risk")}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-blue-900">
        Showing {triageLabels[triage].toLowerCase()}.
      </p>
      {summary.missing_location_count > 0 ||
      summary.unassigned_stops > 0 ||
      summary.missing_evidence_count > 0 ||
      summary.at_risk_stops > 0 ? (
        <p className="mt-3 text-xs font-medium text-blue-900">
          {summary.missing_location_count > 0
            ? `${plural(summary.missing_location_count, "stop")} missing service location. `
            : ""}
          {summary.unassigned_stops > 0
            ? `${plural(summary.unassigned_stops, "stop")} needs technician assignment.`
            : ""}
          {summary.missing_evidence_count > 0
            ? ` ${plural(summary.missing_evidence_count, "stop")} missing synced GPS evidence.`
            : ""}
          {summary.at_risk_stops > 0
            ? ` ${plural(summary.at_risk_stops, "stop")} at risk.`
            : ""}
        </p>
      ) : null}
    </section>
  );
}

function RouteGroupSummaryCard({ group }: { group: DispatchRouteGroupSummary }) {
  return (
    <article className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutralDark">{group.label}</h3>
          <p className="mt-1 text-xs text-gray-500">
            {plural(group.total_stops, "stop")} across {plural(group.days.length, "day")}
          </p>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900">
          {plural(group.gps_evidence_count, "GPS captured", "GPS captured")}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
        <span className="rounded-md bg-gray-50 px-2 py-1">
          {plural(group.active_stops, "active", "active")}
        </span>
        <span className="rounded-md bg-gray-50 px-2 py-1">
          {plural(group.completed_stops, "completed", "completed")}
        </span>
        {group.unassigned_stops > 0 ? (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
            {plural(group.unassigned_stops, "unassigned", "unassigned")}
          </span>
        ) : null}
        {group.missing_coordinates_count > 0 ? (
          <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
            {plural(
              group.missing_coordinates_count,
              "missing coordinates",
              "missing coordinates",
            )}
          </span>
        ) : null}
        {group.missing_location_count > 0 ? (
          <span className="rounded-md bg-red-50 px-2 py-1 text-red-800">
            {plural(group.missing_location_count, "missing location")}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        {group.days.map((day) => (
          <p className="text-xs text-gray-600" key={`${group.id}-${day.date}`}>
            <span className="font-semibold text-neutralDark">{day.label}</span>
            {": "}
            {plural(day.total_stops, "stop")}, {plural(day.active_stops, "active", "active")},{" "}
            {plural(day.completed_stops, "completed", "completed")}
          </p>
        ))}
      </div>
    </article>
  );
}

function RouteGroupsPanel({
  groups,
}: {
  groups: DispatchRouteGroupSummary[];
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutralDark">
            Route groups by technician
          </h2>
          <p className="text-xs text-gray-600">
            Weekly stop load, status mix, GPS evidence, and location readiness.
          </p>
        </div>
        <p className="text-xs font-semibold text-gray-500">
          {plural(groups.length, "group")}
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-gray-200 bg-white p-3 text-sm text-gray-500">
          No route groups for the current filters.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <RouteGroupSummaryCard group={group} key={group.id} />
          ))}
        </div>
      )}
    </section>
  );
}

export function DispatchClient() {
  const jobsQuery = useJobs();
  const customersQuery = useCustomers();
  const geofenceEventsQuery = useJobGeofenceEvents();
  const techniciansQuery = useTechnicians();
  const changeStatus = useChangeJobStatus();
  const assignTechnician = useAssignJobTechnician();
  const hasAppliedTechnicianQuery = useRef(false);
  const [anchorDate, setAnchorDate] = useState(todayKey());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [technician, setTechnician] = useState<TechnicianFilter>("all");
  const [triage, setTriage] = useState<DispatchRouteTriageFilter>("all");
  const technicians = useMemo(
    () => techniciansQuery.data ?? [],
    [techniciansQuery.data],
  );

  useEffect(() => {
    if (hasAppliedTechnicianQuery.current || techniciansQuery.isLoading) {
      return;
    }

    hasAppliedTechnicianQuery.current = true;

    const requestedTechnician = new URLSearchParams(window.location.search).get(
      "technician",
    );

    if (
      requestedTechnician &&
      technicians.some((item) => item.id === requestedTechnician)
    ) {
      setTechnician(requestedTechnician);
    }
  }, [technicians, techniciansQuery.isLoading]);

  const decoratedJobs = useMemo(
    () => (jobsQuery.data ?? []).map((job) => decorateJob(job, customersQuery.data ?? [])),
    [customersQuery.data, jobsQuery.data],
  );
  const weekStart = getDispatchWeekStart(anchorDate);
  const calendarDays = useMemo(
    () => buildDispatchWeek(decoratedJobs, anchorDate, status, technician),
    [anchorDate, decoratedJobs, status, technician],
  );
  const locationEvidenceByJob = useMemo(
    () =>
      buildDispatchLocationEvidenceByJob(
        decoratedJobs.map((job) => job.id),
        geofenceEventsQuery.data ?? [],
      ),
    [decoratedJobs, geofenceEventsQuery.data],
  );
  const routeIntelligence = useMemo(
    () =>
      buildDispatchRouteIntelligenceForDays(calendarDays, technician, {
        evidenceByJob: locationEvidenceByJob,
        now: new Date(),
      }),
    [calendarDays, locationEvidenceByJob, technician],
  );
  const visibleRouteStops = useMemo(
    () => filterDispatchRouteStops(routeIntelligence.stops, triage),
    [routeIntelligence.stops, triage],
  );
  const visibleRouteJobIds = useMemo(
    () => new Set(visibleRouteStops.map((stop) => stop.job.id)),
    [visibleRouteStops],
  );
  const visibleCalendarDays = useMemo(
    () =>
      calendarDays.map((day) => ({
        ...day,
        jobs: day.jobs.filter((job) => visibleRouteJobIds.has(job.id)),
      })),
    [calendarDays, visibleRouteJobIds],
  );
  const visibleRouteIntelligence = useMemo(
    () =>
      buildDispatchRouteIntelligenceForDays(visibleCalendarDays, technician, {
        evidenceByJob: locationEvidenceByJob,
        now: new Date(),
      }),
    [locationEvidenceByJob, technician, visibleCalendarDays],
  );
  const technicianLabels = useMemo(
    () =>
      Object.fromEntries(
        technicians.map((item) => [item.id, getTechnicianLabel(item)]),
      ),
    [technicians],
  );
  const routeGroups = useMemo(
    () =>
      buildDispatchRouteGroupSummaries(visibleCalendarDays, {
        evidenceByJob: locationEvidenceByJob,
        technicianLabels,
      }),
    [locationEvidenceByJob, technicianLabels, visibleCalendarDays],
  );
  const routeStopsByJobId = useMemo(
    () =>
      Object.fromEntries(
        visibleRouteIntelligence.stops.map((stop) => [stop.job.id, stop]),
      ),
    [visibleRouteIntelligence.stops],
  );
  const isUpdating = changeStatus.isPending || assignTechnician.isPending;

  function moveWeek(offset: number) {
    setAnchorDate(getRelativeDispatchWeek(anchorDate, offset));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Admin
            </p>
            <h1 className="text-3xl font-bold text-neutralDark">Dispatch Calendar</h1>
            <div className="mt-3 max-w-3xl space-y-1 text-sm text-gray-600">
              <p>
                Scheduled jobs stay visible for the week so the demo can show routing,
                assignment, and status changes.
              </p>
              <p>
                Completed jobs stay on dispatch for the handoff, then appear in
                closeouts for field-capture review.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => moveWeek(-1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => setAnchorDate(todayKey())}
              type="button"
            >
              Today
            </button>
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-neutralDark hover:bg-gray-50"
              onClick={() => moveWeek(1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Week of
            <input
              aria-label="Week of"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setAnchorDate(event.target.value)}
              type="date"
              value={anchorDate}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Status
            <select
              aria-label="Dispatch status"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              value={status}
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Technician
            <select
              aria-label="Dispatch technician"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) => setTechnician(event.target.value)}
              value={technician}
            >
              <option value="all">All technicians</option>
              <option value="unassigned">Unassigned</option>
              {technicians.map((item) => (
                <option key={item.id} value={item.id}>
                  {getTechnicianLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutralDark">
            Triage
            <select
              aria-label="Dispatch triage"
              className="min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-primary"
              onChange={(event) =>
                setTriage(event.target.value as DispatchRouteTriageFilter)
              }
              value={triage}
            >
              {Object.entries(triageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-sm text-gray-600">Week starting {weekStart}</p>

        <RouteIntelligencePanel
          intelligence={visibleRouteIntelligence}
          triage={triage}
        />
        <RouteGroupsPanel groups={routeGroups} />
      </header>

      {jobsQuery.isLoading ? (
        <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Loading dispatch calendar
        </p>
      ) : (
        <section className="grid gap-3 lg:grid-cols-7">
          {visibleCalendarDays.map((day) => (
            <section
              className="flex min-h-64 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              key={day.date}
            >
              <header className="border-b border-gray-100 pb-2">
                <h2 className="text-sm font-semibold text-neutralDark">{day.label}</h2>
                <p className="text-xs text-gray-500">{day.jobs.length} jobs</p>
              </header>

              {day.jobs.length === 0 ? (
                <div className="space-y-1 text-sm text-gray-500">
                  <p>No jobs scheduled</p>
                  <p>
                    Create or schedule jobs, then use dispatch to assign a technician
                    and move work through completion.
                  </p>
                </div>
              ) : (
                day.jobs.map((job) => (
                  <article
                    className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
                    key={job.id}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span className="rounded-md bg-white px-2 py-1 text-blue-900">
                        {routeStopsByJobId[job.id]
                          ? `Stop ${routeStopsByJobId[job.id].sequence}`
                          : "Outside route"}
                      </span>
                      <span className="text-gray-600">
                        {routeStopLocationLabel(routeStopsByJobId[job.id])}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-md bg-white px-2 py-1 text-gray-700">
                        {routeStopEvidenceLabel(routeStopsByJobId[job.id])}
                      </span>
                      <span className="rounded-md bg-white px-2 py-1 text-gray-700">
                        {routeStopRiskLabel(routeStopsByJobId[job.id])}
                      </span>
                      {routeStopsByJobId[job.id]?.triage_labels.map((label) => (
                        <span
                          className="rounded-md bg-amber-50 px-2 py-1 text-amber-800"
                          key={label}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                        {formatTime(job.scheduled_start)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-neutralDark">
                        {job.customer?.name ?? "Unknown customer"}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">
                        {job.location?.address ?? "No location saved"}
                      </p>
                      {routeStopsByJobId[job.id]?.location_map_url ? (
                        <a
                          className="mt-2 inline-flex text-xs font-semibold text-primary underline-offset-2 hover:underline"
                          href={routeStopsByJobId[job.id].location_map_url ?? undefined}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open service map for {job.id}
                        </a>
                      ) : null}
                    </div>

                    <LocationEvidencePanel
                      evidence={locationEvidenceByJob[job.id]}
                      isLoading={geofenceEventsQuery.isLoading}
                      jobId={job.id}
                    />

                    <label className="flex flex-col gap-1 text-xs font-medium text-neutralDark">
                      Status
                      <select
                        aria-label={`Status for ${job.id}`}
                        className="min-h-9 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-primary"
                        disabled={isUpdating}
                        onChange={(event) =>
                          changeStatus.mutate({
                            job,
                            status: event.target.value as JobStatus,
                          })
                        }
                        value={job.status}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-medium text-neutralDark">
                      Technician
                      <select
                        aria-label={`Technician for ${job.id}`}
                        className="min-h-9 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-primary"
                        disabled={isUpdating}
                        onChange={(event) =>
                          assignTechnician.mutate({
                            job,
                            technicianId: event.target.value || null,
                          })
                        }
                        value={job.assigned_tech_id ?? ""}
                      >
                        <option value="">Unassigned</option>
                        {technicians.map((item) => (
                          <option key={item.id} value={item.id}>
                            {getTechnicianLabel(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))
              )}
            </section>
          ))}
        </section>
      )}
    </main>
  );
}
