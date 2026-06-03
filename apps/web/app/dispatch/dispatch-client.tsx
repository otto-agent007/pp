"use client";

import {
  buildComplianceAdvisory,
  buildDispatchLocationEvidenceByJob,
  buildDispatchRouteExceptionSummary,
  buildDispatchRouteGroupSummaries,
  buildDispatchRouteIntelligenceForDays,
  buildDispatchStaticMapState,
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
  DispatchStaticMapState,
  TechnicianFilter,
} from "@pest-patrol/domain";
import type { Customer, Job, JobStatus } from "@pest-patrol/types";
import {
  Button,
  Card,
  Eyebrow,
  SearchableSelect,
  StatusPill,
  type StatusPillTone,
  buttonClassName,
  formControlClassName,
  formLabelClassName,
  statusSurfaceClassName,
} from "@pest-patrol/ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCustomers } from "../../hooks/useCustomers";
import { useJobGeofenceEvents } from "../../hooks/useGeofencing";
import {
  useAssignJobTechnician,
  useChangeJobStatus,
  useJobs,
  useTechnicians,
} from "../../hooks/useJobs";
import { adminWorkspaceClassName } from "../admin-workspace";
import {
  SanDiegoMapBackdrop,
  dispatchMapMarkerClassName,
  dispatchMapPingClassName,
  dispatchMapPingPaletteLength,
  mapPointSourceLabel,
} from "../san-diego-map";

type StatusFilter = JobStatus | "all";
const statusLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};
const statusLabelEntries = Object.entries(statusLabels) as Array<
  [JobStatus, string]
>;
const triageLabels: Record<DispatchRouteTriageFilter, string> = {
  all: "All dispatch work",
  at_risk: "At risk",
  missing_coordinates: "Missing coordinates",
  missing_evidence: "Missing GPS evidence",
  unassigned: "Unassigned",
};
const quickTriageFilterOrder: DispatchRouteTriageFilter[] = [
  "all",
  "at_risk",
  "unassigned",
  "missing_evidence",
  "missing_coordinates",
];
const quickTriageLabels: Record<DispatchRouteTriageFilter, string> = {
  ...triageLabels,
  all: "All",
};

function ChevronIcon({ direction }: { direction: "next" | "previous" }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={16}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={16}
    >
      <path d={direction === "next" ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
    </svg>
  );
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function decorateJob(job: Job, customers: Customer[]) {
  const customer =
    job.customer ?? customers.find((item) => item.id === job.customer_id);
  const location =
    job.location ??
    customer?.locations?.find((item) => item.id === job.location_id);

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

function technicianSignalInitial(label: string) {
  const cleaned = label.replace(/^Demo\s*-\s*/i, "").trim();
  const firstWord = cleaned.split(/\s+/).find((part) => /[a-z0-9]/i.test(part));

  return firstWord?.[0]?.toUpperCase() ?? "T";
}

function accuracyLabel(value: number | null) {
  return value === null
    ? "Accuracy unavailable"
    : `Accuracy ${Math.round(value)} m`;
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

function locationEvidenceSummary(
  evidence: DispatchLocationEvidence | undefined,
  isLoading: boolean,
  jobId: string,
): { label: string; tone: StatusPillTone } {
  if (isLoading) {
    return {
      label: "Loading GPS evidence",
      tone: "neutral" as StatusPillTone,
    };
  }

  const state = evidence ?? missingLocationEvidence(jobId);

  return {
    label: state.summary_label,
    tone: state.latest_event ? "info" : "warning",
  };
}

function quickTriageCount(
  filter: DispatchRouteTriageFilter,
  intelligence: DispatchRouteIntelligence,
) {
  const summary = intelligence.summary;

  switch (filter) {
    case "at_risk":
      return summary.at_risk_stops;
    case "missing_coordinates":
      return summary.missing_coordinates_count;
    case "missing_evidence":
      return summary.missing_evidence_count;
    case "unassigned":
      return summary.unassigned_stops;
    case "all":
    default:
      return summary.total_stops;
  }
}

function GpsEvidenceEventRow({
  event,
}: {
  event: DispatchLocationEvidenceEvent;
}) {
  const label = gpsEventLabel(event.event_type);

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-theme-text-primary">{label}</p>
        <a
          className="text-xs font-semibold text-theme-action-primary underline-offset-2 hover:underline"
          href={event.map_url}
          rel="noreferrer"
          target="_blank"
        >
          Open {label.toLowerCase()} map
        </a>
      </div>
      <p className="mt-1 text-xs text-theme-text-secondary">
        {formatCapturedTime(event.captured_at)} - {event.radius_label}
      </p>
      <p className="mt-1 text-xs text-theme-text-muted">
        {accuracyLabel(event.accuracy_m)}
      </p>
    </Card>
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

  if (isLoading) {
    return (
      <p className="text-xs text-theme-text-muted">Loading GPS evidence...</p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-theme-text-muted">
        No synced GPS evidence yet
      </p>
    );
  }

  return (
    <section
      aria-label={`GPS evidence for ${jobId}`}
      className={`rounded-md border p-3 ${statusSurfaceClassName("info")}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Eyebrow className="text-status-alert-info-fgStrong">
          GPS evidence
        </Eyebrow>
        <p className="text-xs font-semibold text-status-alert-info-fgStrong">
          {state.summary_label}
        </p>
      </div>
      <div className="mt-2 space-y-2">
        {events.map((event) => (
          <GpsEvidenceEventRow
            event={event}
            key={`${event.event_type}-${event.captured_at}`}
          />
        ))}
      </div>
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
  const exceptionSummary = buildDispatchRouteExceptionSummary(
    intelligence.stops,
  );

  return (
    <section
      className={`rounded-lg border p-4 text-sm text-status-alert-info-fgStrong ${statusSurfaceClassName(
        "info",
      )}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-semibold">Technician daily route companion</p>
          <p className="mt-1">
            Technician mobile routes use the same assigned jobs, status
            priority, and scheduled order shown here.
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
          <StatusPill dot={false} tone="info">
            {plural(summary.total_stops, "stop")}
          </StatusPill>
          <StatusPill dot={false} tone="neutral">
            {plural(summary.active_stops, "active", "active")}
          </StatusPill>
          <StatusPill dot={false} tone="success">
            {plural(summary.completed_stops, "completed", "completed")}
          </StatusPill>
          <StatusPill
            dot={false}
            tone={summary.missing_coordinates_count > 0 ? "warning" : "neutral"}
          >
            {plural(
              summary.missing_coordinates_count,
              "missing coordinates",
              "missing coordinates",
            )}
          </StatusPill>
          <StatusPill
            dot={false}
            tone={summary.missing_evidence_count > 0 ? "warning" : "neutral"}
          >
            {plural(
              summary.missing_evidence_count,
              "missing GPS evidence",
              "missing GPS evidence",
            )}
          </StatusPill>
          <StatusPill
            dot={false}
            tone={summary.at_risk_stops > 0 ? "danger" : "neutral"}
          >
            {plural(summary.at_risk_stops, "at risk", "at risk")}
          </StatusPill>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-status-alert-info-fgStrong">
        Showing {triageLabels[triage].toLowerCase()}.
      </p>
      <div className="mt-3 rounded-md border border-status-alert-info-border bg-theme-background-surface p-3">
        <Eyebrow className="text-status-alert-info-fgStrong">
          Exception review
        </Eyebrow>
        <p className="mt-1 text-sm font-semibold text-status-alert-info-fgStrong">
          {exceptionSummary.label}
        </p>
        {exceptionSummary.items.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {exceptionSummary.items.map((item) => (
              <Card key={item.filter} padding="sm" statusTone="info">
                <p className="text-xs font-semibold text-status-alert-info-fgStrong">
                  {item.label}
                </p>
                <p className="text-xs text-status-alert-info-fgStrong">
                  {plural(item.count, "stop")}
                </p>
                <p className="mt-1 text-xs text-status-alert-info-fg">
                  {item.summary}
                </p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
      {summary.missing_location_count > 0 ||
      summary.unassigned_stops > 0 ||
      summary.missing_evidence_count > 0 ||
      summary.at_risk_stops > 0 ? (
        <p className="mt-3 text-xs font-medium text-status-alert-info-fgStrong">
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

function DispatchStaticMapPanel({
  mapState,
  techLabelColorMap,
}: {
  mapState: DispatchStaticMapState;
  techLabelColorMap: Record<string, number>;
}) {
  return (
    <Card aria-label="Provider-free San Diego dispatch map" tone="subtle">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
            Provider-free still map
          </p>
          <h2 className="mt-1 text-sm font-semibold text-theme-text-primary">
            San Diego dispatch map
          </h2>
          <p className="mt-1 text-xs text-theme-text-secondary">
            Custom schematic for the demo route story. Signals group stops by
            technician, with latest synced GPS shown when available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-theme-text-secondary">
          <StatusPill dot={false} tone="info">
            {plural(
              mapState.summary.plotted_technicians_count,
              "technician signal",
              "technician signals",
            )}
          </StatusPill>
          <StatusPill dot={false} tone="warning">
            {plural(
              mapState.summary.missing_coordinates_count,
              "missing coordinates",
              "missing coordinates",
            )}
          </StatusPill>
          <StatusPill dot={false} tone="neutral">
            {plural(
              mapState.summary.outside_map_count,
              "outside San Diego view",
              "outside San Diego view",
            )}
          </StatusPill>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-theme-border-subtle bg-primitive-navy-950">
          <SanDiegoMapBackdrop />
          {mapState.points.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-semibold text-theme-text-secondary">
              No stops are pinned in the San Diego view.
            </div>
          ) : null}
          {mapState.points.map((point) => {
            const colorIdx = techLabelColorMap[point.technician_label] ?? 0;
            const pingColor = dispatchMapPingClassName(colorIdx);

            return (
              <div
                className="absolute"
                key={point.job_id}
                style={{
                  left: `${point.x_percent}%`,
                  top: `${point.y_percent}%`,
                }}
              >
                {point.source === "latest_gps" ? (
                  <span
                    aria-hidden="true"
                    className={`absolute inline-flex min-h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-60 ${pingColor}`}
                  />
                ) : null}
                <span
                  aria-label={`Technician signal ${point.technician_label}: ${point.customer_label}`}
                  className={`absolute inline-flex min-h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-1 text-xs font-bold shadow-sm ${dispatchMapMarkerClassName(
                    point.marker_tone,
                  )}`}
                  role="img"
                  title={`${point.technician_label}: ${point.customer_label}`}
                >
                  {technicianSignalInitial(point.technician_label)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {mapState.points.length === 0 ? (
            <p className="rounded-md border border-dashed border-theme-border-subtle bg-theme-background-surface p-3 text-sm text-theme-text-muted">
              Assign technicians, add San Diego service coordinates, or sync GPS
              evidence to place signals on this overview.
            </p>
          ) : (
            mapState.points.map((point) => {
              const colorIdx = techLabelColorMap[point.technician_label] ?? 0;
              const dotColor = dispatchMapPingClassName(colorIdx);

              return (
                <Card key={`${point.job_id}-summary`} padding="sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-theme-text-muted">
                        {point.technician_label}
                      </p>
                      <h3 className="text-sm font-semibold text-theme-text-primary">
                        {point.customer_label}
                      </h3>
                    </div>
                    <StatusPill dot={false} tone="info">
                      {mapPointSourceLabel(point.source)}
                    </StatusPill>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-theme-text-secondary">
                    <span className="relative inline-flex h-2 w-2 shrink-0">
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
                      />
                      <span
                        className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}
                      />
                    </span>
                    {point.technician_label}
                  </p>
                  <p className="mt-1 text-xs text-theme-text-secondary">
                    {point.address_label}
                  </p>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}

function RouteGroupSummaryCard({
  group,
}: {
  group: DispatchRouteGroupSummary;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {group.label}
          </h3>
          <p className="mt-1 text-xs text-theme-text-muted">
            {plural(group.total_stops, "stop")} across{" "}
            {plural(group.days.length, "day")}
          </p>
        </div>
        <StatusPill dot={false} tone="info">
          {plural(group.gps_evidence_count, "GPS captured", "GPS captured")}
        </StatusPill>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-theme-text-secondary">
        <StatusPill dot={false} tone="neutral">
          {plural(group.active_stops, "active", "active")}
        </StatusPill>
        <StatusPill dot={false} tone="success">
          {plural(group.completed_stops, "completed", "completed")}
        </StatusPill>
        {group.unassigned_stops > 0 ? (
          <StatusPill dot={false} tone="warning">
            {plural(group.unassigned_stops, "unassigned", "unassigned")}
          </StatusPill>
        ) : null}
        {group.missing_coordinates_count > 0 ? (
          <StatusPill dot={false} tone="warning">
            {plural(
              group.missing_coordinates_count,
              "missing coordinates",
              "missing coordinates",
            )}
          </StatusPill>
        ) : null}
        {group.missing_location_count > 0 ? (
          <StatusPill dot={false} tone="danger">
            {plural(group.missing_location_count, "missing location")}
          </StatusPill>
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        {group.days.map((day) => (
          <p
            className="text-xs text-theme-text-secondary"
            key={`${group.id}-${day.date}`}
          >
            <span className="font-semibold text-theme-text-primary">
              {day.label}
            </span>
            {": "}
            {plural(day.total_stops, "stop")},{" "}
            {plural(day.active_stops, "active", "active")},{" "}
            {plural(day.completed_stops, "completed", "completed")}
          </p>
        ))}
      </div>
    </Card>
  );
}

function RouteGroupsPanel({ groups }: { groups: DispatchRouteGroupSummary[] }) {
  return (
    <Card tone="subtle">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-theme-text-primary">
            Route groups by technician
          </h2>
          <p className="text-xs text-theme-text-secondary">
            Weekly stop load, status mix, GPS evidence, and location readiness.
          </p>
        </div>
        <p className="text-xs font-semibold text-theme-text-muted">
          {plural(groups.length, "group")}
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-theme-border-subtle bg-theme-background-surface p-3 text-sm text-theme-text-muted">
          No route groups for the current filters.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <RouteGroupSummaryCard group={group} key={group.id} />
          ))}
        </div>
      )}
    </Card>
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
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [technician, setTechnician] = useState<TechnicianFilter>("all");
  const [triage, setTriage] = useState<DispatchRouteTriageFilter>("all");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const technicians = useMemo(
    () => techniciansQuery.data ?? [],
    [techniciansQuery.data],
  );
  const technicianFilterOptions = useMemo(
    () => [
      { label: "All technicians", value: "all" },
      { label: "Unassigned", value: "unassigned" },
      ...technicians.map((item) => ({
        keywords: [item.email, item.display_name].filter(
          (value): value is string => Boolean(value),
        ),
        label: getTechnicianLabel(item),
        value: item.id,
      })),
    ],
    [technicians],
  );
  const technicianAssignmentOptions = useMemo(
    () => [
      { label: "Unassigned", value: "" },
      ...technicians.map((item) => ({
        keywords: [item.email, item.display_name].filter(
          (value): value is string => Boolean(value),
        ),
        label: getTechnicianLabel(item),
        value: item.id,
      })),
    ],
    [technicians],
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
    () =>
      (jobsQuery.data ?? []).map((job) =>
        decorateJob(job, customersQuery.data ?? []),
      ),
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
  const quickTriageFilters = useMemo(
    () =>
      quickTriageFilterOrder.map((value) => ({
        count: quickTriageCount(value, routeIntelligence),
        label: quickTriageLabels[value],
        value,
      })),
    [routeIntelligence],
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

  // Assign a stable color index to each technician (sorted by id for consistency)
  const techLabelColorMap = useMemo(() => {
    const sorted = [...technicians].sort((a, b) => a.id.localeCompare(b.id));
    return Object.fromEntries(
      sorted.map((t, i) => [
        getTechnicianLabel(t),
        i % dispatchMapPingPaletteLength,
      ]),
    );
  }, [technicians]);
  const dispatchStaticMapState = useMemo(
    () =>
      buildDispatchStaticMapState(visibleRouteIntelligence.stops, {
        evidenceByJob: locationEvidenceByJob,
        technicianLabels,
      }),
    [locationEvidenceByJob, technicianLabels, visibleRouteIntelligence.stops],
  );
  const routeGroups = useMemo(
    () =>
      buildDispatchRouteGroupSummaries(visibleCalendarDays, {
        evidenceByJob: locationEvidenceByJob,
        technicianLabels,
      }),
    [locationEvidenceByJob, technicianLabels, visibleCalendarDays],
  );
  const recurringCompliancePreview = useMemo(
    () =>
      buildComplianceAdvisory({
        chunks: [],
        job:
          decoratedJobs.find((job) => job.status === "completed") ??
          decoratedJobs[0] ??
          null,
        workflow: "recurring_route",
      }),
    [decoratedJobs],
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

  function moveMonth(offset: number) {
    const anchor = new Date(`${anchorDate}T00:00:00`);
    anchor.setMonth(anchor.getMonth() + offset, 1);
    setAnchorDate(anchor.toISOString().slice(0, 10));
  }

  // Build month grid data (only computed when viewMode === "month")
  const monthData = useMemo(() => {
    if (viewMode !== "month") return null;
    const anchor = new Date(`${anchorDate}T00:00:00`);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const monthLabel = anchor.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayJobs = decoratedJobs.filter((job) => {
        if (!job.scheduled_start) return false;
        const jobDate = job.scheduled_start.slice(0, 10);
        if (jobDate !== dateStr) return false;
        if (status !== "all" && job.status !== status) return false;
        if (technician === "unassigned") return !job.assigned_tech_id;
        if (technician !== "all") return job.assigned_tech_id === technician;
        return true;
      });
      return { date: dateStr, dayNum: d, jobs: dayJobs };
    });

    return { days, firstWeekday, monthLabel };
  }, [viewMode, anchorDate, decoratedJobs, status, technician]);

  const monthJobStatusColor: Record<JobStatus, string> = {
    scheduled: "bg-status-alert-info-solid",
    en_route: "bg-status-alert-warning-solid",
    in_progress: "bg-status-alert-warning-solid",
    completed: "bg-status-alert-success-solid",
    canceled: "bg-status-alert-danger-solid",
  };

  return (
    <main className={adminWorkspaceClassName}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow tone="accent">Admin</Eyebrow>
            <h1 className="text-3xl font-bold text-theme-text-primary">
              Dispatch Calendar
            </h1>
            <div className="mt-3 max-w-3xl space-y-1 text-sm text-theme-text-secondary">
              <p>
                Scheduled jobs stay visible for the week so the demo can show
                routing, assignment, and status changes.
              </p>
              <p>
                Completed jobs stay on dispatch for the handoff, then appear in
                closeouts for field-capture review.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View mode toggle */}
            <div className="flex overflow-hidden rounded-md border border-theme-border-default">
              <button
                className={`px-3 py-1.5 text-sm font-semibold transition ${
                  viewMode === "week"
                    ? "bg-theme-action-primary text-theme-text-inverse"
                    : "bg-theme-background-surface text-theme-text-secondary hover:bg-theme-background-subtle"
                }`}
                onClick={() => setViewMode("week")}
                type="button"
              >
                Week
              </button>
              <button
                className={`border-l border-theme-border-default px-3 py-1.5 text-sm font-semibold transition ${
                  viewMode === "month"
                    ? "bg-theme-action-primary text-theme-text-inverse"
                    : "bg-theme-background-surface text-theme-text-secondary hover:bg-theme-background-subtle"
                }`}
                onClick={() => setViewMode("month")}
                type="button"
              >
                Month
              </button>
            </div>
            {viewMode === "week" ? (
              <>
                <button
                  aria-label="Previous week"
                  className={buttonClassName({ size: "sm", variant: "subtle" })}
                  onClick={() => moveWeek(-1)}
                  type="button"
                >
                  <ChevronIcon direction="previous" />
                </button>
                <Button
                  onClick={() => setAnchorDate(todayKey())}
                  size="sm"
                  variant="primary"
                >
                  Today
                </Button>
                <button
                  aria-label="Next week"
                  className={buttonClassName({ size: "sm", variant: "subtle" })}
                  onClick={() => moveWeek(1)}
                  type="button"
                >
                  <ChevronIcon direction="next" />
                </button>
              </>
            ) : (
              <>
                <button
                  aria-label="Previous month"
                  className={buttonClassName({ size: "sm", variant: "subtle" })}
                  onClick={() => moveMonth(-1)}
                  type="button"
                >
                  <ChevronIcon direction="previous" />
                </button>
                <Button
                  onClick={() => setAnchorDate(todayKey())}
                  size="sm"
                  variant="primary"
                >
                  Today
                </Button>
                <button
                  aria-label="Next month"
                  className={buttonClassName({ size: "sm", variant: "subtle" })}
                  onClick={() => moveMonth(1)}
                  type="button"
                >
                  <ChevronIcon direction="next" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={formLabelClassName}>
            Week of
            <input
              aria-label="Week of"
              className={formControlClassName}
              onChange={(event) => setAnchorDate(event.target.value)}
              type="date"
              value={anchorDate}
            />
          </label>
          <label className={formLabelClassName}>
            Status
            <select
              aria-label="Dispatch status"
              className={formControlClassName}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
              value={status}
            >
              <option value="all">All statuses</option>
              {statusLabelEntries.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <SearchableSelect
            ariaLabel="Dispatch technician"
            emptyMessage="No technicians found"
            label="Technician"
            onChange={(value) => setTechnician(value as TechnicianFilter)}
            options={technicianFilterOptions}
            value={technician}
          />
          <label className={formLabelClassName}>
            Triage
            <select
              aria-label="Dispatch triage"
              className={formControlClassName}
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

        <p className="text-sm text-theme-text-secondary">
          {viewMode === "month"
            ? monthData?.monthLabel
            : `Week starting ${weekStart}`}
        </p>

        <section
          aria-label="Exception quick filters"
          className="flex min-w-0 flex-wrap gap-2"
        >
          {quickTriageFilters.map((filter) => {
            const isActive = triage === filter.value;

            return (
              <button
                aria-label={`${filter.label} ${filter.count}`}
                aria-pressed={isActive}
                className={`inline-flex min-h-9 max-w-full items-center gap-2 rounded-md border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-theme-action-primary bg-primitive-sky-50 text-theme-action-primary"
                    : "border-theme-border-subtle bg-theme-background-surface text-theme-text-secondary hover:bg-theme-background-subtle hover:text-theme-text-primary"
                }`}
                key={filter.value}
                onClick={() => setTriage(filter.value)}
                type="button"
              >
                <span className="min-w-0 break-words text-left">
                  {filter.label}
                </span>
                <span className="rounded-full bg-theme-background-subtle px-2 py-0.5 text-[11px] text-theme-text-primary">
                  {filter.count}
                </span>
              </button>
            );
          })}
        </section>
      </header>

      <section aria-label="Dispatch intelligence" className="grid gap-4">
        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            Route intelligence
            <span className="ml-2 font-normal text-theme-text-muted">
              {" - "}
              {plural(visibleRouteIntelligence.summary.total_stops, "stop")}
              {visibleRouteIntelligence.summary.at_risk_stops > 0
                ? ` - ${plural(visibleRouteIntelligence.summary.at_risk_stops, "at risk", "at risk")}`
                : ""}
            </span>
          </summary>
          <div className="hidden gap-4 border-t border-theme-border-subtle p-4 group-open:grid">
            <DispatchStaticMapPanel
              mapState={dispatchStaticMapState}
              techLabelColorMap={techLabelColorMap}
            />
            <RouteIntelligencePanel
              intelligence={visibleRouteIntelligence}
              triage={triage}
            />
          </div>
        </details>

        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            Route groups and compliance
            <span className="ml-2 font-normal text-theme-text-muted">
              {" - "}
              {plural(routeGroups.length, "group")}
            </span>
          </summary>
          <div className="hidden gap-4 border-t border-theme-border-subtle p-4 group-open:grid">
            <RouteGroupsPanel groups={routeGroups} />
            <section className="rounded-lg border border-status-alert-info-border bg-status-alert-info-bg p-4 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-status-alert-info-fg">
                    Recurring-route compliance
                  </p>
                  <p className="mt-1 text-sm text-status-alert-info-fgStrong">
                    {
                      recurringCompliancePreview.required_fields.filter(
                        (field) => field.status === "missing",
                      ).length
                    }{" "}
                    route evidence fields need review before a cited
                    recurring-service advisory.
                  </p>
                </div>
                <a
                  className={buttonClassName({
                    className:
                      "border-status-alert-info-border bg-theme-background-surface text-status-alert-info-fgStrong hover:bg-primitive-sky-100 hover:text-status-alert-info-fgStrong",
                    variant: "ghost",
                  })}
                  href="/compliance"
                >
                  Review rules
                </a>
              </div>
            </section>
          </div>
        </details>
      </section>

      {jobsQuery.isLoading ? (
        <p className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-5 text-sm text-theme-text-secondary">
          Loading dispatch calendar
        </p>
      ) : viewMode === "month" && monthData ? (
        <section aria-label="Monthly dispatch calendar">
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                className="py-2 text-center text-xs font-bold text-theme-text-muted"
                key={d}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-theme-border-subtle bg-theme-border-subtle">
            {Array.from({ length: monthData.firstWeekday }).map((_, i) => (
              <div
                className="min-h-24 bg-theme-background-canvas p-1.5"
                key={`empty-${i}`}
              />
            ))}
            {monthData.days.map((day) => {
              const isToday = day.date === todayKey();
              const hasJobs = day.jobs.length > 0;
              return (
                <div
                  className={`min-h-24 p-1.5 ${
                    isToday
                      ? "bg-primitive-sky-50 ring-1 ring-inset ring-primitive-sky-300"
                      : "bg-theme-background-surface"
                  }`}
                  key={day.date}
                >
                  <p
                    className={`mb-1 text-xs font-bold ${
                      isToday
                        ? "text-primitive-sky-600"
                        : "text-theme-text-primary"
                    }`}
                  >
                    {day.dayNum}
                  </p>
                  {hasJobs ? (
                    <div className="mb-1 flex flex-wrap gap-0.5">
                      {day.jobs.slice(0, 6).map((job) => (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${monthJobStatusColor[job.status] ?? "bg-theme-border-default"}`}
                          key={job.id}
                          title={statusLabels[job.status]}
                        />
                      ))}
                    </div>
                  ) : null}
                  {day.jobs.slice(0, 3).map((job) => (
                    <button
                      className="mb-0.5 w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-tight bg-theme-background-subtle text-theme-text-primary hover:bg-primitive-sky-100 transition"
                      key={job.id}
                      onClick={() => {
                        setViewMode("week");
                        setAnchorDate(day.date);
                      }}
                      title={`${job.scheduled_start ? formatTime(job.scheduled_start) : ""} - ${job.customer?.name ?? "Job"}`}
                      type="button"
                    >
                      {job.scheduled_start
                        ? `${formatTime(job.scheduled_start)} `
                        : ""}
                      {job.customer?.name ?? "Job"}
                    </button>
                  ))}
                  {day.jobs.length > 3 ? (
                    <button
                      className="w-full text-left text-[10px] font-semibold text-theme-text-muted hover:text-theme-action-primary transition"
                      onClick={() => {
                        setViewMode("week");
                        setAnchorDate(day.date);
                      }}
                      type="button"
                    >
                      +{day.jobs.length - 3} more
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-theme-text-secondary">
            {statusLabelEntries.map(([value, label]) => (
              <span className="flex items-center gap-1" key={value}>
                <span
                  className={`h-2 w-2 rounded-full ${monthJobStatusColor[value] ?? "bg-theme-border-default"}`}
                />
                {label}
              </span>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid min-w-0 gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {visibleCalendarDays.map((day) => {
            const isDayToday = day.date === todayKey();
            return (
              <Card
                className={`flex min-h-64 min-w-0 flex-col gap-3 ${isDayToday ? "ring-2 ring-inset ring-theme-action-primary" : ""}`}
                key={day.date}
                padding="sm"
              >
                <header
                  className={`border-b pb-2 ${isDayToday ? "border-theme-action-primary/30" : "border-primitive-slate-100"}`}
                >
                  <h2
                    className={`text-sm font-semibold ${isDayToday ? "text-theme-action-primary" : "text-theme-text-primary"}`}
                  >
                    {day.label}
                  </h2>
                  <p className="text-xs text-theme-text-muted">
                    {day.jobs.length} jobs
                  </p>
                </header>

                {day.jobs.length === 0 ? (
                  <div className="space-y-1 text-sm text-theme-text-muted">
                    <p>No jobs scheduled</p>
                    <p>
                      Create or schedule jobs, then use dispatch to assign a
                      technician and move work through completion.
                    </p>
                  </div>
                ) : (
                  day.jobs.map((job) => {
                    const isExpanded = expandedJobId === job.id;
                    const techLabel = job.assigned_tech_id
                      ? (technicianLabels[job.assigned_tech_id] ?? "Assigned")
                      : "Unassigned";
                    const routeStop = routeStopsByJobId[job.id];
                    const evidenceSummary = locationEvidenceSummary(
                      locationEvidenceByJob[job.id],
                      geofenceEventsQuery.isLoading,
                      job.id,
                    );

                    return (
                      <Card
                        aria-label={`Dispatch job ${job.id}: ${
                          job.customer?.name ?? "Unknown customer"
                        }`}
                        className="flex min-w-0 flex-col gap-2"
                        key={job.id}
                        padding="sm"
                        role="group"
                        tone="subtle"
                      >
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <StatusPill
                              className="max-w-full whitespace-normal break-words text-left"
                              dot={false}
                              tone="info"
                            >
                              {routeStop
                                ? `Stop ${routeStop.sequence}`
                                : "Outside route"}
                            </StatusPill>
                            <StatusPill
                              className="max-w-full whitespace-normal break-words text-left"
                              dot={false}
                              tone={
                                routeStop?.location_state === "ready"
                                  ? "neutral"
                                  : "warning"
                              }
                            >
                              {routeStopLocationLabel(routeStop)}
                            </StatusPill>
                          </div>
                          <span className="text-theme-text-muted">
                            {formatTime(job.scheduled_start)}
                          </span>
                        </div>

                        {routeStop?.triage_labels.length > 0 ? (
                          <div className="flex min-w-0 flex-wrap gap-1.5 text-xs font-semibold">
                            {routeStop.triage_labels.map((label) => (
                              <StatusPill
                                className="max-w-full whitespace-normal break-words text-left"
                                dot={false}
                                key={label}
                                tone="warning"
                              >
                                {label}
                              </StatusPill>
                            ))}
                          </div>
                        ) : null}

                        <div className="min-w-0">
                          <h3 className="mt-1 text-sm font-semibold text-theme-text-primary">
                            {job.customer?.name ?? "Unknown customer"}
                          </h3>
                          <p className="mt-0.5 truncate text-xs text-theme-text-secondary">
                            {job.location?.address ?? "No location saved"}
                          </p>
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                          <StatusPill
                            className="max-w-full whitespace-normal break-words text-left"
                            dot={false}
                            tone="neutral"
                          >
                            {statusLabels[job.status]}
                          </StatusPill>
                          <span className="min-w-0 max-w-full truncate text-theme-text-muted">
                            {techLabel}
                          </span>
                          <StatusPill
                            className="max-w-full whitespace-normal break-words text-left"
                            dot={false}
                            tone={evidenceSummary.tone}
                          >
                            {evidenceSummary.label}
                          </StatusPill>
                        </div>

                        <button
                          aria-expanded={isExpanded}
                          aria-label={`${
                            isExpanded
                              ? "Close details for"
                              : "Details for"
                          } ${job.id}: ${
                            job.customer?.name ?? "Unknown customer"
                          }`}
                          className={buttonClassName({
                            className: "mt-1",
                            fullWidth: true,
                            size: "sm",
                            variant: isExpanded ? "subtle" : "ghost",
                          })}
                          onClick={() =>
                            setExpandedJobId(isExpanded ? null : job.id)
                          }
                          type="button"
                        >
                          {isExpanded ? "Close" : "Details"}
                        </button>

                        {isExpanded ? (
                          <div className="flex flex-col gap-3 border-t border-theme-border-subtle pt-3">
                            <LocationEvidencePanel
                              evidence={locationEvidenceByJob[job.id]}
                              isLoading={geofenceEventsQuery.isLoading}
                              jobId={job.id}
                            />

                            {routeStop?.location_map_url ? (
                              <a
                                aria-label={`Open service map for ${job.id}`}
                                className="inline-flex w-fit text-xs font-semibold text-theme-action-primary underline-offset-2 hover:underline"
                                href={routeStop.location_map_url ?? undefined}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Open in Maps
                              </a>
                            ) : null}

                            <label className="flex flex-col gap-1 text-xs font-medium text-theme-text-primary">
                              Status
                              <select
                                aria-label={`Status for ${job.id}`}
                                className="min-h-9 rounded-md border border-theme-border-default bg-theme-background-surface px-2 text-xs text-theme-text-primary outline-none focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20"
                                disabled={isUpdating}
                                onChange={(event) =>
                                  changeStatus.mutate({
                                    job,
                                    status: event.target.value as JobStatus,
                                  })
                                }
                                value={job.status}
                              >
                                {statusLabelEntries.map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <SearchableSelect
                              ariaLabel={`Technician for ${job.id}`}
                              disabled={isUpdating}
                              emptyMessage="No technicians found"
                              label="Technician"
                              onChange={(technicianId) =>
                                assignTechnician.mutate({
                                  job,
                                  technicianId: technicianId || null,
                                })
                              }
                              options={technicianAssignmentOptions}
                              size="sm"
                              value={job.assigned_tech_id ?? ""}
                            />
                          </div>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
