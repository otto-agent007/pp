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
        <p className="mt-2 text-xs text-theme-text-secondary">
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
          <StatusPill dot={false} tone="info">
            {plural(summary.active_stops, "active", "active")}
          </StatusPill>
          <StatusPill dot={false} tone="info">
            {plural(summary.completed_stops, "completed", "completed")}
          </StatusPill>
          <StatusPill dot={false} tone="info">
            {plural(
              summary.missing_coordinates_count,
              "missing coordinates",
              "missing coordinates",
            )}
          </StatusPill>
          <StatusPill dot={false} tone="info">
            {plural(
              summary.missing_evidence_count,
              "missing GPS evidence",
              "missing GPS evidence",
            )}
          </StatusPill>
          <StatusPill dot={false} tone="info">
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
              <Card
                key={item.filter}
                padding="sm"
                statusTone="info"
              >
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

function mapPointSourceLabel(
  source: DispatchStaticMapState["points"][number]["source"],
) {
  return source === "service_location" ? "Service coordinates" : "Latest GPS";
}

function SanDiegoMapBackdrop() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 640 380"
    >
      <rect
        className="fill-primitive-navy-950"
        height="380"
        rx="24"
        width="640"
      />
      <path
        className="fill-primitive-slate-800"
        d="M214 0h426v380H244c-17-26-21-55-11-86 9-29 4-55-17-78-22-24-22-48 0-72 18-20 20-42 6-66-14-25-17-51-8-78z"
      />
      <path
        className="fill-primitive-navy-900"
        d="M401 0h239v380H457c-22-30-34-64-37-101-3-46 12-77 45-94 38-19 49-49 34-91-12-35-45-53-98-54z"
        opacity="0.78"
      />
      <path
        className="fill-primitive-slate-700"
        d="M460 20c56 12 102 36 138 72v288H489c-24-28-31-62-22-102 8-35 2-68-19-100-22-34-18-64 12-91 20-18 20-40 0-67z"
        opacity="0.38"
      />
      <path
        className="fill-primitive-sky-600"
        d="M214 0c-8 26-6 53 8 78 14 24 12 46-6 66-22 24-22 48 0 72 21 23 26 49 17 78-10 31-6 60 11 86h-69c-16-31-16-63 1-96 14-28 8-52-19-73-28-22-31-48-9-78 20-27 19-54-4-81-15-18-18-35-10-52z"
        opacity="0.32"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M214 0c-8 26-6 53 8 78 14 24 12 46-6 66-22 24-22 48 0 72 21 23 26 49 17 78-10 31-6 60 11 86"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <path
        className="fill-primitive-sky-600"
        d="M204 175c28-13 61-4 72 20 13 30-15 59-57 57-37-2-60-22-51-47 5-14 17-24 36-30z"
        opacity="0.36"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M204 175c28-13 61-4 72 20 13 30-15 59-57 57-37-2-60-22-51-47 5-14 17-24 36-30z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        className="fill-primitive-sky-600"
        d="M227 286c41-25 100-28 153-10 31 11 32 45 0 65-51 32-114 24-164 39-20-24-16-53 11-94z"
        opacity="0.31"
      />
      <path
        className="stroke-primitive-sky-200"
        d="M227 286c41-25 100-28 153-10 31 11 32 45 0 65-51 32-114 24-164 39-20-24-16-53 11-94z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        className="stroke-theme-text-inverse"
        d="M264 54l58-15 42 25 19 42-30 37 17 37-38 41 20 38-54 29-7 50-51-11-30 23-24-38 17-47-27-39 29-44-12-50 31-31z"
        opacity="0.58"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        className="stroke-theme-text-inverse"
        d="M240 213l36 20 24-14 36 12 43-18 39 15 39-17 58 6 34-25"
        opacity="0.35"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        className="stroke-primitive-slate-300"
        d="M268 19c29 52 30 111 3 178-22 55-16 105 20 151"
        opacity="0.42"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        className="stroke-primitive-slate-300"
        d="M330 18c38 57 46 111 25 160-23 52-14 104 26 156"
        opacity="0.38"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <g className="stroke-primitive-sky-200" opacity="0.62">
        <path
          d="M225 14c17 45 18 89 4 132-16 48-8 93 24 136 19 26 25 55 18 88"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M305 43c20 55 20 104 0 148-21 47-12 93 28 139"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M174 225c70-14 137-10 201 13 67 24 137 17 210-20"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M201 148c75 25 145 29 209 11 58-17 114-10 168 22"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M315 304c72-3 143-13 213-30 39-9 76-12 112-9"
          strokeLinecap="round"
          strokeWidth="4"
        />
      </g>
      <g className="stroke-primitive-slate-300" opacity="0.26">
        <path
          d="M252 112c64 18 129 15 194-8"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M238 187c43 11 86 9 130-6"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M285 255c35 20 75 24 119 13"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M373 40c-8 38-4 75 13 111"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M472 80c-14 46-12 89 8 130"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </g>
      <g
        className="fill-primitive-slate-300 stroke-primitive-sky-200"
        strokeWidth="2"
      >
        <circle cx="225" cy="220" r="13" />
        <circle cx="411" cy="70" r="13" />
        <circle cx="332" cy="173" r="13" />
        <circle cx="512" cy="296" r="13" />
      </g>
      <g
        className="fill-primitive-navy-950 text-[10px] font-bold"
        textAnchor="middle"
      >
        <text x="225" y="224">
          8
        </text>
        <text x="411" y="74">
          78
        </text>
        <text x="332" y="177">
          52
        </text>
        <text x="512" y="300">
          94
        </text>
      </g>
      <g
        className="fill-theme-text-inverse stroke-primitive-navy-950 font-semibold"
        paintOrder="stroke"
        strokeWidth="3"
      >
        <text className="text-[12px]" x="178" y="16">
          Oceanside
        </text>
        <text className="text-[12px]" x="198" y="38">
          Carlsbad
        </text>
        <text className="text-[12px]" x="213" y="92">
          Encinitas
        </text>
        <text className="text-[12px]" x="310" y="38">
          San Marcos
        </text>
        <text className="text-[12px]" x="330" y="70">
          Escondido
        </text>
        <text className="text-[12px]" x="415" y="113">
          Ramona
        </text>
        <text className="text-[12px]" x="316" y="139">
          Poway
        </text>
        <text className="text-[12px]" x="348" y="187">
          Santee
        </text>
        <text className="text-[12px]" x="345" y="216">
          El Cajon
        </text>
        <text className="text-[12px]" x="310" y="236">
          La Mesa
        </text>
        <text className="text-[13px]" x="255" y="286">
          Chula Vista
        </text>
        <text className="text-[12px]" x="516" y="167">
          Descanso
        </text>
        <text className="text-[12px]" x="530" y="318">
          Tecate
        </text>
        <text className="text-[12px]" x="173" y="334">
          La Jolla
        </text>
        <text className="text-[10px]" x="178" y="213">
          Mission Bay
        </text>
        <text className="text-[10px]" x="216" y="342">
          Point Loma
        </text>
        <text className="text-[10px]" x="260" y="330">
          San Diego Bay
        </text>
        <text className="text-[11px]" x="118" y="100">
          Pacific
        </text>
        <text className="text-[10px]" x="258" y="164">
          I-5
        </text>
        <text className="text-[10px]" x="318" y="119">
          I-805
        </text>
        <text className="text-[10px]" x="426" y="92">
          I-15
        </text>
        <text className="text-[10px]" x="451" y="206">
          I-8
        </text>
      </g>
      <g
        className="fill-theme-text-inverse stroke-primitive-navy-950 font-bold"
        paintOrder="stroke"
        strokeWidth="4"
      >
        <text className="text-[30px]" x="208" y="254">
          San Diego
        </text>
        <text className="text-[28px]" x="282" y="344">
          Tijuana
        </text>
      </g>
    </svg>
  );
}

function DispatchStaticMapPanel({
  mapState,
}: {
  mapState: DispatchStaticMapState;
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
            Custom schematic for the demo route story. Pins use service
            coordinates first, then latest synced GPS evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-theme-text-secondary">
          <StatusPill dot={false} tone="info">
            {plural(mapState.summary.plotted_stops, "plotted", "plotted")}
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
        <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-theme-border-subtle bg-theme-background-surface">
          <SanDiegoMapBackdrop />
          {mapState.points.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-semibold text-theme-text-secondary">
              No stops are pinned in the San Diego view.
            </div>
          ) : null}
          {mapState.points.map((point) => (
            <span
              aria-label={`Map pin ${point.label}: ${point.customer_label}`}
              className="absolute inline-flex min-h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-theme-background-surface bg-theme-action-primary px-1 text-xs font-bold text-theme-background-surface shadow-sm"
              key={point.job_id}
              role="img"
              style={{
                left: `${point.x_percent}%`,
                top: `${point.y_percent}%`,
              }}
              title={`${point.label}: ${point.customer_label}`}
            >
              {point.label.replace("Stop ", "")}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {mapState.points.length === 0 ? (
            <p className="rounded-md border border-dashed border-theme-border-subtle bg-theme-background-surface p-3 text-sm text-theme-text-muted">
              Add San Diego service coordinates or sync GPS evidence to place
              pins on this overview.
            </p>
          ) : (
            mapState.points.map((point) => (
              <Card key={`${point.job_id}-summary`} padding="sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-theme-text-muted">
                      {point.label}
                    </p>
                    <h3 className="text-sm font-semibold text-theme-text-primary">
                      {point.customer_label}
                    </h3>
                  </div>
                  <StatusPill dot={false} tone="info">
                    {mapPointSourceLabel(point.source)}
                  </StatusPill>
                </div>
                <p className="mt-2 text-xs text-theme-text-secondary">
                  {point.address_label}
                </p>
              </Card>
            ))
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [technician, setTechnician] = useState<TechnicianFilter>("all");
  const [triage, setTriage] = useState<DispatchRouteTriageFilter>("all");
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
  const dispatchStaticMapState = useMemo(
    () =>
      buildDispatchStaticMapState(visibleRouteIntelligence.stops, {
        evidenceByJob: locationEvidenceByJob,
      }),
    [locationEvidenceByJob, visibleRouteIntelligence.stops],
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8">
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => moveWeek(-1)} variant="subtle">
              Previous week
            </Button>
            <Button onClick={() => setAnchorDate(todayKey())} variant="primary">
              Today
            </Button>
            <Button onClick={() => moveWeek(1)} variant="subtle">
              Next week
            </Button>
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
              {Object.entries(statusLabels).map(([value, label]) => (
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
          Week starting {weekStart}
        </p>
      </header>

      <section aria-label="Dispatch intelligence" className="grid gap-4">
        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            Route intelligence
          </summary>
          <div className="hidden gap-4 border-t border-theme-border-subtle p-4 group-open:grid">
            <RouteIntelligencePanel
              intelligence={visibleRouteIntelligence}
              triage={triage}
            />
            <DispatchStaticMapPanel mapState={dispatchStaticMapState} />
          </div>
        </details>

        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            Route groups and compliance
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
      ) : (
        <section className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {visibleCalendarDays.map((day) => (
            <Card
              className="flex min-h-64 flex-col gap-3"
              key={day.date}
              padding="sm"
            >
              <header className="border-b border-primitive-slate-100 pb-2">
                <h2 className="text-sm font-semibold text-theme-text-primary">
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
                day.jobs.map((job) => (
                  <Card
                    className="flex flex-col gap-3"
                    key={job.id}
                    padding="sm"
                    tone="subtle"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <StatusPill dot={false} tone="info">
                        {routeStopsByJobId[job.id]
                          ? `Stop ${routeStopsByJobId[job.id].sequence}`
                          : "Outside route"}
                      </StatusPill>
                      <span className="text-theme-text-secondary">
                        {routeStopLocationLabel(routeStopsByJobId[job.id])}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <StatusPill dot={false} tone="neutral">
                        {routeStopEvidenceLabel(routeStopsByJobId[job.id])}
                      </StatusPill>
                      <StatusPill dot={false} tone="neutral">
                        {routeStopRiskLabel(routeStopsByJobId[job.id])}
                      </StatusPill>
                      {routeStopsByJobId[job.id]?.triage_labels.map((label) => (
                        <StatusPill dot={false} key={label} tone="warning">
                          {label}
                        </StatusPill>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                        {formatTime(job.scheduled_start)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-theme-text-primary">
                        {job.customer?.name ?? "Unknown customer"}
                      </h3>
                      <p className="mt-1 text-xs text-theme-text-secondary">
                        {job.location?.address ?? "No location saved"}
                      </p>
                      {routeStopsByJobId[job.id]?.location_map_url ? (
                        <a
                          className="mt-2 inline-flex text-xs font-semibold text-theme-action-primary underline-offset-2 hover:underline"
                          href={
                            routeStopsByJobId[job.id].location_map_url ??
                            undefined
                          }
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
                        {Object.entries(statusLabels).map(([value, label]) => (
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
                  </Card>
                ))
              )}
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
