"use client";

import {
  buildDispatchLocationEvidenceByJob,
  buildDispatchRouteIntelligence,
  buildDispatchStaticMapState,
  buildHomeCommandCenterState,
  getTechnicianLabel,
  type HomeCommandCenterSeverity,
} from "@pest-patrol/domain";
import {
  Card,
  Eyebrow,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import type {
  ChemicalInventoryItem,
  Invoice,
  Job,
  TechnicianProfile,
} from "@pest-patrol/types";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { useBrowserSpeechTranscribe } from "../hooks/useBrowserSpeechTranscribe";
import { useWhisperTranscribe } from "../hooks/useWhisperTranscribe";

import { useAdminAuth } from "./admin-auth-context";
import { DemoSeedControls } from "./demo-seed-controls";
import { useCustomerPortalProviderStatus } from "../hooks/useCustomerPortalAccess";
import { useCustomers } from "../hooks/useCustomers";
import { useJobGeofenceEvents } from "../hooks/useGeofencing";
import { useJobs } from "../hooks/useJobs";
import { useChemicalInventory } from "../hooks/useInventory";
import { useInvoices } from "../hooks/usePayments";
import { useTechnicians } from "../hooks/useTechnicians";
import {
  SanDiegoMapBackdrop,
  dispatchMapMarkerClassName,
  dispatchMapPingClassName,
  dispatchMapPingPaletteLength,
  mapPointSourceLabel,
} from "./san-diego-map";

export function isLocalWhisperSearchEnabled(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "development";
}

// ---------------------------------------------------------------------------
// Mic button: visual states for idle, recording, transcribing, and error.
// ---------------------------------------------------------------------------
function MicButton({
  onClick,
  status,
  title,
}: {
  onClick: () => void;
  status: "idle" | "requesting" | "recording" | "transcribing" | "error";
  title: string;
}) {
  // Mic sits at far right (right-2). When × is also visible it sits at right-8.
  const baseClass =
    "absolute inset-y-0 right-2 flex items-center px-1 transition-colors";

  if (status === "recording") {
    return (
      <button
        aria-label="Stop recording"
        className={`${baseClass} right-2 text-status-alert-danger-fg hover:bg-status-alert-danger-bg`}
        onClick={onClick}
        title="Recording - click to stop"
        type="button"
      >
        {/* Solid square = stop */}
        <svg fill="currentColor" height={14} viewBox="0 0 24 24" width={14}>
          <rect height="14" rx="2" width="14" x="5" y="5" />
        </svg>
      </button>
    );
  }

  if (status === "transcribing") {
    return (
      <span
        aria-label="Transcribing..."
        className={`${baseClass} animate-pulse text-theme-action-primary`}
        title="Transcribing..."
      >
        {/* Spinning dots */}
        <svg fill="currentColor" height={14} viewBox="0 0 24 24" width={14}>
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="19" r="2" opacity=".4" />
          <circle cx="5" cy="12" r="2" opacity=".7" />
          <circle cx="19" cy="12" r="2" opacity=".2" />
        </svg>
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        aria-label="Transcription error - click to dismiss"
        className={`${baseClass} text-status-alert-danger-fg hover:bg-status-alert-danger-bg`}
        onClick={onClick}
        title={title}
        type="button"
      >
        <svg
          fill="none"
          height={14}
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width={14}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </button>
    );
  }

  // idle / requesting
  return (
    <button
      aria-label="Search by voice"
      className={`${baseClass} text-theme-text-muted hover:text-theme-action-primary`}
      onClick={onClick}
      title={title}
      type="button"
    >
      <svg
        fill="none"
        height={14}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        width={14}
      >
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path
          d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

const severityTones: Record<HomeCommandCenterSeverity, StatusPillTone> = {
  good: "success",
  neutral: "neutral",
  urgent: "danger",
  warning: "warning",
};

const openInvoiceStatuses = new Set(["draft", "sent"]);
const emptyJobs: Job[] = [];
const emptyTechnicians: TechnicianProfile[] = [];
const emptyInventory: ChemicalInventoryItem[] = [];
const emptyInvoices: Invoice[] = [];
const AVATAR_PALETTES = [
  "bg-primitive-sky-100 text-primitive-sky-900",
  "bg-primitive-green-100 text-primitive-green-900",
  "bg-primitive-yellow-100 text-primitive-yellow-900",
  "bg-primitive-slate-100 text-primitive-slate-900",
];

function serviceLabel(notes: string | null | undefined) {
  const trimmed = notes?.trim();

  if (!trimmed) return "Service visit";

  // Strip auto-generated seed prefixes and bracket tags so labels are
  // readable in production and demo contexts alike.
  return (
    trimmed
      .replace(/\[.*?\]/g, "") // remove [tag] tokens
      .replace(
        /^Generated\s+weekly\s+route\s+stop\s+\d+\s+for\s+the\s+large\s+editable\s+demo\.\s*/i,
        "",
      )
      .trim() || "Service visit"
  );
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstName(name: string | null | undefined) {
  const trimmed = name?.trim();

  if (!trimmed) {
    return "operator";
  }

  return trimmed.split(/\s+/)[0] ?? "operator";
}

function greetingLabel(now: Date) {
  const hour = now.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function operationsDateLabel(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  })
    .format(now)
    .toUpperCase();
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);
}

function inventoryUnit(
  item: Pick<ChemicalInventoryItem, "unit"> | { unit?: string },
) {
  return item.unit ? String(item.unit) : "units";
}

function scheduleStatusTone(statusLabel: string): StatusPillTone | undefined {
  return statusLabel === "Scheduled" ? "info" : undefined;
}

function techInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      : (parts[0]?.slice(0, 2) ?? "");

  return initials.toUpperCase() || "T";
}

// ---------------------------------------------------------------------------
// Spark bars — 7-bar inline mini-chart used inside BiKpiCard.
// ---------------------------------------------------------------------------
function SparkBars({
  colorClass,
  values,
}: {
  colorClass: string;
  values: number[];
}) {
  const max = Math.max(...values, 1);

  return (
    <div aria-hidden="true" className="mt-2 flex h-8 items-end gap-px">
      {values.map((v, i) => (
        <div
          className={`flex-1 rounded-sm ${colorClass}`}
          key={i}
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BI KPI card — replaces StatTile with spark chart + one-line insight.
// ---------------------------------------------------------------------------
function BiKpiCard({
  delta,
  deltaPositive,
  insight,
  insightTone,
  label,
  sparkColorClass,
  sparkValues,
  value,
}: {
  delta: string;
  deltaPositive: boolean | null;
  insight: string;
  insightTone: "good" | "warning" | "info" | "neutral";
  label: string;
  sparkColorClass: string;
  sparkValues: number[];
  value: string;
}) {
  const deltaClass =
    deltaPositive === null
      ? "text-theme-text-secondary"
      : deltaPositive
        ? "text-status-alert-success-fg"
        : "text-status-alert-danger-fg";

  const dotClass = {
    good: "bg-primitive-green-100 border border-primitive-green-300",
    info: "bg-primitive-sky-100 border border-primitive-sky-300",
    neutral: "border border-theme-border-default bg-theme-background-subtle",
    warning: "border border-primitive-yellow-300 bg-primitive-yellow-100",
  }[insightTone];

  return (
    <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-theme-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-primitive-navy-950">
        {value}
      </p>
      <p className={`mt-0.5 text-xs font-semibold ${deltaClass}`}>{delta}</p>
      <SparkBars colorClass={sparkColorClass} values={sparkValues} />
      <div className="mt-2 flex items-start gap-1.5 border-t border-theme-border-subtle pt-2">
        <span
          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
        />
        <p className="text-xs font-semibold leading-relaxed text-theme-text-secondary">
          {insight}
        </p>
      </div>
    </div>
  );
}

function InsightBanner({
  href,
  narrative,
}: {
  href?: string;
  narrative: string;
}) {
  const content = (
    <>
      <div>
        <Eyebrow tone="accent">Operator insight</Eyebrow>
        <p className="mt-1 text-base font-bold text-primitive-navy-950">
          {narrative}
        </p>
      </div>
      {href ? (
        <span className={buttonClassName({ size: "sm", variant: "ghost" })}>
          Review
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        className="flex flex-col gap-3 rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm transition hover:border-theme-action-primary sm:flex-row sm:items-center sm:justify-between"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
      {content}
    </div>
  );
}

function DashboardMap({
  liveTechCount,
  mapState,
  techLabelColorMap,
}: {
  liveTechCount: number;
  mapState: ReturnType<typeof buildDispatchStaticMapState>;
  techLabelColorMap: Record<string, number>;
}) {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="flex items-start justify-between gap-3 border-b border-theme-border-subtle px-4 py-3">
        <div>
          <Eyebrow tone="accent">Today&apos;s route</Eyebrow>
          <h2 className="mt-1 text-lg font-bold">Live map</h2>
          <p className="text-sm font-semibold text-theme-text-secondary">
            {liveTechCount} techs live
          </p>
        </div>
        <Link
          className={buttonClassName({ size: "sm", variant: "ghost" })}
          href="/dispatch"
        >
          Open map
        </Link>
      </div>
      <div
        aria-label="Provider-free San Diego live map"
        className="relative aspect-[4/3] min-h-72 overflow-hidden bg-primitive-navy-950"
      >
        <SanDiegoMapBackdrop />
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
              {/* Blinking GPS signal ring */}
              <span
                className={`absolute inline-flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-60 ${pingColor}`}
              />
              {/* Solid marker */}
              <Link
                aria-label={`${point.technician_label} GPS marker ${point.label}: ${point.customer_label}`}
                className={`absolute inline-flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-extrabold shadow-sm ${dispatchMapMarkerClassName(
                  point.marker_tone,
                )}`}
                href={`/jobs/${point.job_id}`}
              >
                {point.label.replace("Stop ", "")}
              </Link>
            </div>
          );
        })}
        {mapState.points.length === 0 ? (
          <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md border border-dashed border-theme-border-default bg-theme-background-surface/90 p-3 text-sm font-semibold text-theme-text-secondary">
            Sync GPS evidence or add service coordinates to plot today&apos;s
            route.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-theme-border-subtle border-t border-theme-border-subtle text-center text-xs font-bold text-theme-text-secondary sm:grid-cols-4 sm:divide-y-0">
        <p className="px-2 py-2">{mapState.summary.plotted_stops} plotted</p>
        {/* Link "missing GPS" to dispatch so operators have an action path */}
        {mapState.summary.missing_coordinates_count > 0 ? (
          <Link
            className="px-2 py-2 text-theme-text-secondary underline-offset-2 hover:text-theme-action-primary hover:underline"
            href="/dispatch"
            title="View jobs missing GPS coordinates in Dispatch"
          >
            {mapState.summary.missing_coordinates_count} missing GPS
          </Link>
        ) : (
          <p className="px-2 py-2">All GPS plotted</p>
        )}
        <p className="px-2 py-2">{mapState.bounds.label}</p>
        <p className="px-2 py-2">
          {mapState.points[0]
            ? mapPointSourceLabel(mapState.points[0].source)
            : "GPS ready"}
        </p>
      </div>
    </Card>
  );
}


function buildSearchItems({
  inventory,
  invoices,
  jobs,
}: {
  inventory: ChemicalInventoryItem[];
  invoices: Invoice[];
  jobs: Job[];
}) {
  return [
    ...jobs.map((job) => ({
      href: `/jobs/${job.id}`,
      label: job.customer?.name ?? serviceLabel(job.service_notes),
      meta: [serviceLabel(job.service_notes), job.location?.address, job.status]
        .filter(Boolean)
        .join(" · "),
    })),
    ...inventory.map((item) => ({
      href: "/inventory",
      label: item.name,
      meta: `${item.current_stock} ${inventoryUnit(item)} in stock`,
    })),
    ...invoices.map((invoice) => ({
      href: "/payments",
      label: `${formatCurrency(invoice.total_cents)} invoice`,
      meta: invoice.status,
    })),
  ];
}

export function HomeCommandCenter() {
  const [search, setSearch] = useState("");
  const { profile } = useAdminAuth();

  const handleTranscript = useCallback((text: string) => setSearch(text), []);
  const localWhisperSearchEnabled = isLocalWhisperSearchEnabled();
  const whisperVoice = useWhisperTranscribe({ onTranscript: handleTranscript });
  const browserVoice = useBrowserSpeechTranscribe({
    onTranscript: handleTranscript,
  });
  const voiceSearch = localWhisperSearchEnabled
    ? {
        error: whisperVoice.error,
        providerLabel: "Search by voice (local Whisper)",
        status: whisperVoice.status,
        toggle: whisperVoice.toggle,
      }
    : browserVoice.supported
      ? {
          error: browserVoice.error,
          providerLabel: "Search by voice (browser speech)",
          status: browserVoice.status,
          toggle: browserVoice.toggle,
        }
      : null;
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const techniciansQuery = useTechnicians();
  const inventoryQuery = useChemicalInventory();
  const invoicesQuery = useInvoices();
  const portalProviderQuery = useCustomerPortalProviderStatus();
  const geofenceEventsQuery = useJobGeofenceEvents();

  const now = useMemo(() => new Date(), []);
  const today = dateKey(now);
  const jobs = jobsQuery.data ?? emptyJobs;
  const technicians = techniciansQuery.data ?? emptyTechnicians;
  const inventory = inventoryQuery.data ?? emptyInventory;
  const invoices = invoicesQuery.data ?? emptyInvoices;
  const locationEvidenceByJob = buildDispatchLocationEvidenceByJob(
    jobs.map((job) => job.id),
    geofenceEventsQuery.data ?? [],
  );
  const technicianLabels = Object.fromEntries(
    technicians.map((technician) => [
      technician.id,
      getTechnicianLabel(technician),
    ]),
  );

  // Assign a stable color index to each technician (sorted by id for consistency)
  const techColorMap = Object.fromEntries(
    [...technicians]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((t, i) => [t.id, i % dispatchMapPingPaletteLength]),
  );

  // Map technician label → color index (for the map's point.technician_label)
  const techLabelColorMap = Object.fromEntries(
    Object.entries(technicianLabels).map(([id, label]) => [
      label,
      techColorMap[id] ?? 0,
    ]),
  );

  // Map job id → assigned tech id (for coloring schedule entries)
  const jobTechIdMap = Object.fromEntries(
    jobs.map((job) => [job.id, job.assigned_tech_id ?? null]),
  );

  const routeIntelligence = buildDispatchRouteIntelligence(jobs, today, "all", {
    evidenceByJob: locationEvidenceByJob,
    now,
  });
  const mapState = buildDispatchStaticMapState(routeIntelligence.stops, {
    evidenceByJob: locationEvidenceByJob,
    technicianLabels,
  });

  const state = buildHomeCommandCenterState({
    customers: customersQuery.data?.map((customer) => ({
      status: customer.status,
    })),
    inventory: inventory.map((item) => ({
      current_stock: item.current_stock,
      name: item.name,
      reorder_level: item.reorder_level,
    })),
    invoices: invoices.map((invoice) => ({
      status: invoice.status,
      total_cents: invoice.total_cents,
    })),
    jobs: jobs.map((job) => ({
      customerName: job.customer?.name,
      id: job.id,
      scheduled_start: job.scheduled_start,
      serviceLabel: serviceLabel(job.service_notes),
      status: job.status,
    })),
    now,
    portalProviderStatus: portalProviderQuery.data,
    technicians: technicians.map((technician) => ({
      status: technician.status,
    })),
  });

  const loading =
    customersQuery.isLoading ||
    jobsQuery.isLoading ||
    geofenceEventsQuery.isLoading ||
    techniciansQuery.isLoading ||
    inventoryQuery.isLoading ||
    invoicesQuery.isLoading ||
    portalProviderQuery.isLoading;
  const lowInventory = inventory
    .filter(
      (item) =>
        item.reorder_level !== null &&
        item.reorder_level !== undefined &&
        item.current_stock <= item.reorder_level,
    )
    .slice(0, 3);
  const query = search.trim().toLowerCase();
  const searchResults = query
    ? buildSearchItems({ inventory, invoices, jobs })
        .filter((item) =>
          `${item.label} ${item.meta}`.toLowerCase().includes(query),
        )
        .slice(0, 5)
    : [];
  const openInvoices = invoices.filter((invoice) =>
    openInvoiceStatuses.has(invoice.status),
  );

  // -------------------------------------------------------------------------
  // BI metrics — computed from seed/live data; designed for historical data
  // wiring later.  All values degrade gracefully to zero / empty.
  // -------------------------------------------------------------------------
  const biMetrics = useMemo(() => {
    const monthKey = now.toISOString().slice(0, 7); // "2026-05"

    // Revenue ----------------------------------------------------------------
    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    const totalPaidCents = paidInvoices.reduce(
      (s, inv) => s + inv.total_cents,
      0,
    );
    const mtdPaidCents = paidInvoices
      .filter((inv) => (inv.updated_at ?? inv.created_at).startsWith(monthKey))
      .reduce((s, inv) => s + inv.total_cents, 0);
    const avgTicketCents =
      paidInvoices.length > 0
        ? Math.round(totalPaidCents / paidInvoices.length)
        : 0;

    // Overdue ----------------------------------------------------------------
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const overdueInvoices = invoices.filter(
      (inv) =>
        (inv.status === "sent" || inv.status === "draft") &&
        inv.due_date !== null &&
        inv.due_date !== undefined &&
        new Date(inv.due_date) < thirtyDaysAgo,
    );
    const overdueTotalCents = overdueInvoices.reduce(
      (s, inv) => s + inv.total_cents,
      0,
    );

    // Spark data — 7-day rolling window -------------------------------------
    const revenueSparkValues = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const k = dateKey(d);
      return paidInvoices
        .filter((inv) => (inv.updated_at ?? inv.created_at).startsWith(k))
        .reduce((s, inv) => s + inv.total_cents, 0);
    });

    const jobSparkValues = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const k = dateKey(d);
      return jobs.filter((job) => job.scheduled_start.startsWith(k)).length;
    });

    const invoiceSparkValues = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const k = dateKey(d);
      return invoices.filter((inv) => inv.created_at.startsWith(k)).length;
    });

    // Tech performance -------------------------------------------------------
    const jobRevMap = new Map<string, number>();
    for (const inv of paidInvoices) {
      jobRevMap.set(
        inv.job_id,
        (jobRevMap.get(inv.job_id) ?? 0) + inv.total_cents,
      );
    }

    const techStatsMap = new Map<
      string,
      { jobCount: number; revenueCents: number }
    >();
    for (const job of jobs) {
      if (job.assigned_tech_id) {
        const s = techStatsMap.get(job.assigned_tech_id) ?? {
          jobCount: 0,
          revenueCents: 0,
        };
        s.jobCount++;
        s.revenueCents += jobRevMap.get(job.id) ?? 0;
        techStatsMap.set(job.assigned_tech_id, s);
      }
    }

    const techPerformance = technicians
      .map((tech) => ({
        id: tech.id,
        label: getTechnicianLabel(tech),
        jobCount: techStatsMap.get(tech.id)?.jobCount ?? 0,
        revenueCents: techStatsMap.get(tech.id)?.revenueCents ?? 0,
      }))
      .sort(
        (a, b) => b.revenueCents - a.revenueCents || b.jobCount - a.jobCount,
      )
      .slice(0, 4);

    const maxTechRevenue = Math.max(
      ...techPerformance.map((t) => t.revenueCents),
      1,
    );

    // Projected MTD revenue -------------------------------------------------
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const projectedMtdCents =
      mtdPaidCents > 0 && dayOfMonth > 0
        ? Math.round((mtdPaidCents / dayOfMonth) * daysInMonth)
        : 0;

    return {
      avgTicketCents,
      invoiceSparkValues,
      jobSparkValues,
      maxTechRevenue,
      mtdPaidCents,
      mtdPaidCount: paidInvoices.filter((inv) =>
        (inv.updated_at ?? inv.created_at).startsWith(monthKey),
      ).length,
      overdueCount: overdueInvoices.length,
      overdueTotalCents,
      paidCount: paidInvoices.length,
      projectedMtdCents,
      revenueSparkValues,
      techPerformance,
      totalPaidCents,
    };
  }, [invoices, jobs, now, technicians]);

  const insightNarrative = useMemo(() => {
    const {
      avgTicketCents,
      mtdPaidCents,
      overdueCount,
      overdueTotalCents,
      projectedMtdCents,
    } = biMetrics;

    if (overdueCount >= 2 && overdueTotalCents > 50_000) {
      return `${overdueCount} invoices totaling ${formatCurrency(overdueTotalCents)} are overdue - send reminders before next dispatch.`;
    }

    if (projectedMtdCents > 0) {
      const avgLabel =
        avgTicketCents > 0
          ? ` - avg ticket ${formatCurrency(avgTicketCents)}`
          : "";
      return `On pace for ${formatCurrency(projectedMtdCents)} this month${avgLabel}.`;
    }

    if (mtdPaidCents > 0) {
      return `${formatCurrency(mtdPaidCents)} collected so far this month.`;
    }

    return "Dispatch is running normally. Seed demo data to see revenue insights.";
  }, [biMetrics]);

  const insightHref = biMetrics.overdueCount > 0 ? "/payments" : undefined;

  return (
    <main className="min-h-screen bg-theme-background-canvas text-theme-text-primary">
      <section className="border-b border-theme-border-subtle bg-theme-background-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-[1fr_minmax(18rem,26rem)_auto] lg:items-center">
            <div>
              <Eyebrow tone="accent">Operations</Eyebrow>
              <h1 className="mt-1 text-2xl font-extrabold text-primitive-navy-950">
                Dashboard overview
              </h1>
              <p className="mt-1 text-xs font-bold uppercase text-theme-text-muted">
                {operationsDateLabel(now)} · SAN DIEGO DISPATCH
              </p>
            </div>
            <div className="relative block">
              <span className="sr-only">Search overview</span>
              <input
                aria-label="Search overview"
                className={`min-h-10 w-full rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-semibold outline-none transition placeholder:text-theme-text-muted focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20 ${
                  voiceSearch ? "pr-14" : "pr-8"
                }`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers, jobs, addresses..."
                type="search"
                value={search}
              />
              {/* Clear button is always visible when there is text. */}
              {search ? (
                <button
                  aria-label="Clear search"
                  className={`absolute inset-y-0 flex items-center text-theme-text-muted hover:text-theme-text-primary ${
                    voiceSearch ? "right-8 px-1" : "right-2"
                  }`}
                  onClick={() => setSearch("")}
                  type="button"
                >
                  ×
                </button>
              ) : null}
              {voiceSearch ? (
                <MicButton
                  onClick={voiceSearch.toggle}
                  status={voiceSearch.status}
                  title={voiceSearch.error ?? voiceSearch.providerLabel}
                />
              ) : null}
            </div>
            <div className="flex gap-2">
              <Link
                className={buttonClassName({ size: "sm", variant: "ghost" })}
                href="/dispatch"
              >
                Open dispatch
              </Link>
              <Link className={buttonClassName({ size: "sm" })} href="/jobs">
                New job
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-2xl font-extrabold text-primitive-navy-950">
                {greetingLabel(now)},{" "}
                {firstName(profile?.display_name ?? profile?.email)}
              </p>
              <p className="mt-1 min-h-5 text-sm font-semibold text-theme-text-secondary">
                {loading
                  ? "Refreshing operations snapshot"
                  : state.nextAction.summary}
              </p>
            </div>
            {/* Portal mode indicator — links to customers so operators know what it means */}
            <Link
              className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold transition hover:opacity-80"
              href="/customers"
              title="Customer portal sharing mode — click to manage"
            >
              <span className="text-xs font-bold uppercase text-theme-text-muted">
                Portal mode:
              </span>
              <StatusPill tone={loading ? "neutral" : "info"}>
                {loading ? "Refreshing" : state.portalProviderLabel}
              </StatusPill>
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {query ? (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Search</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">Search results</h2>
              </div>
              <StatusPill tone="neutral">
                {searchResults.length} matches
              </StatusPill>
            </div>
            <div className="mt-3 divide-y divide-theme-border-subtle">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <Link
                    className="block py-3 text-sm transition hover:bg-theme-background-subtle"
                    href={item.href}
                    key={`${item.href}-${item.label}`}
                  >
                    <p className="font-bold text-primitive-navy-950">
                      {item.label}
                    </p>
                    <p className="mt-1 text-theme-text-secondary">
                      {item.meta}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-3 text-sm font-semibold text-theme-text-secondary">
                  No dashboard matches for that search.
                </p>
              )}
            </div>
          </Card>
        ) : null}

        <section
          aria-label="Dashboard metrics"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Revenue */}
          <BiKpiCard
            delta={
              biMetrics.paidCount > 0
                ? `${biMetrics.paidCount} paid ${biMetrics.paidCount === 1 ? "invoice" : "invoices"}`
                : "No paid invoices yet"
            }
            deltaPositive={biMetrics.paidCount > 0 ? true : null}
            insight={
              biMetrics.projectedMtdCents > 0
                ? `On pace for ${formatCurrency(biMetrics.projectedMtdCents)} this month`
                : biMetrics.totalPaidCents > 0
                  ? `${formatCurrency(biMetrics.totalPaidCents)} total collected`
                  : "Seed demo data to track revenue"
            }
            insightTone={biMetrics.totalPaidCents > 0 ? "good" : "neutral"}
            label="Revenue MTD"
            sparkColorClass="bg-primitive-sky-400 opacity-80"
            sparkValues={biMetrics.revenueSparkValues}
            value={
              biMetrics.mtdPaidCents > 0
                ? formatCurrency(biMetrics.mtdPaidCents)
                : formatCurrency(biMetrics.totalPaidCents)
            }
          />

          {/* Jobs today */}
          <BiKpiCard
            delta={state.kpis.find((k) => k.id === "todays-jobs")?.detail ?? ""}
            deltaPositive={null}
            insight={
              mapState.summary.missing_coordinates_count > 0
                ? `${mapState.summary.missing_coordinates_count} ${mapState.summary.missing_coordinates_count === 1 ? "job" : "jobs"} not yet GPS-confirmed`
                : state.kpis.find((k) => k.id === "todays-jobs")?.value !== "0"
                  ? "All scheduled jobs have GPS coverage"
                  : "No jobs scheduled today"
            }
            insightTone={
              mapState.summary.missing_coordinates_count > 0
                ? "warning"
                : state.kpis.find((k) => k.id === "todays-jobs")?.value !== "0"
                  ? "good"
                  : "neutral"
            }
            label="Jobs today"
            sparkColorClass="bg-primitive-slate-400 opacity-70"
            sparkValues={biMetrics.jobSparkValues}
            value={state.kpis.find((k) => k.id === "todays-jobs")?.value ?? "0"}
          />

          {/* Avg ticket */}
          <BiKpiCard
            delta={
              biMetrics.paidCount > 0
                ? `across ${biMetrics.paidCount} billed ${biMetrics.paidCount === 1 ? "job" : "jobs"}`
                : "No billed jobs yet"
            }
            deltaPositive={null}
            insight={
              lowInventory.length > 0
                ? `${lowInventory.length} ${lowInventory.length === 1 ? "supply" : "supplies"} below reorder level`
                : biMetrics.avgTicketCents > 0
                  ? "Chemicals & supplies stocked"
                  : "No invoices to analyse yet"
            }
            insightTone={
              lowInventory.length > 0
                ? "warning"
                : biMetrics.avgTicketCents > 0
                  ? "good"
                  : "neutral"
            }
            label="Avg ticket"
            sparkColorClass="bg-primitive-green-400 opacity-80"
            sparkValues={biMetrics.invoiceSparkValues}
            value={
              biMetrics.avgTicketCents > 0
                ? formatCurrency(biMetrics.avgTicketCents)
                : "—"
            }
          />

          {/* Overdue invoices */}
          <BiKpiCard
            delta={
              biMetrics.overdueCount > 0
                ? `${biMetrics.overdueCount} ${biMetrics.overdueCount === 1 ? "invoice" : "invoices"} 30+ days past due`
                : openInvoices.length > 0
                  ? `${openInvoices.length} open ${openInvoices.length === 1 ? "invoice" : "invoices"}`
                  : "No open invoices"
            }
            deltaPositive={
              biMetrics.overdueCount === 0 && openInvoices.length === 0
                ? true
                : biMetrics.overdueCount > 0
                  ? false
                  : null
            }
            insight={
              biMetrics.overdueCount > 0
                ? "Consider sending payment reminders"
                : openInvoices.length > 0
                  ? `${formatCurrency(openInvoices.reduce((s, inv) => s + inv.total_cents, 0))} awaiting payment`
                  : "All invoices current"
            }
            insightTone={
              biMetrics.overdueCount > 0
                ? "warning"
                : openInvoices.length > 0
                  ? "info"
                  : "good"
            }
            label="Overdue invoices"
            sparkColorClass="bg-primitive-yellow-400 opacity-80"
            sparkValues={biMetrics.invoiceSparkValues.map((v, i) =>
              i < 5 ? Math.max(0, v - (5 - i)) : v,
            )}
            value={
              biMetrics.overdueTotalCents > 0
                ? formatCurrency(biMetrics.overdueTotalCents)
                : openInvoices.length > 0
                  ? `${openInvoices.length} open`
                  : "$0"
            }
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Today&apos;s dispatch</Eyebrow>
                <h2 className="mt-1 text-xl font-bold">
                  Today&apos;s schedule
                </h2>
                <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                  {state.schedule.length} jobs · {technicians.length}{" "}
                  technicians
                </p>
              </div>
              <Link
                className={buttonClassName({ size: "sm", variant: "ghost" })}
                href="/dispatch"
              >
                View dispatch
              </Link>
            </div>

            <div className="mt-4 divide-y divide-theme-border-subtle">
              {state.schedule.length > 0 ? (
                state.schedule.map((job) => {
                  const techId = jobTechIdMap[job.id];
                  const techName = techId ? technicianLabels[techId] : null;
                  const colorIdx =
                    techId !== null && techId !== undefined
                      ? (techColorMap[techId] ?? 0)
                      : null;
                  const dotColor =
                    colorIdx !== null
                      ? dispatchMapPingClassName(colorIdx)
                      : null;

                  return (
                    <Link
                      className="grid gap-3 py-3 transition hover:bg-theme-background-subtle sm:grid-cols-[5rem_1fr_auto]"
                      href={job.href}
                      key={job.id}
                    >
                      <p className="text-sm font-extrabold tabular-nums text-primitive-navy-950">
                        {job.timeLabel}
                      </p>
                      <div>
                        <p className="font-bold text-primitive-navy-950">
                          {job.serviceLabel}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                          {job.customerName}
                        </p>
                        {techName && dotColor ? (
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-theme-text-secondary">
                            <span className="relative inline-flex h-2 w-2 shrink-0">
                              <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
                              />
                              <span
                                className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`}
                              />
                            </span>
                            {techName}
                          </p>
                        ) : null}
                      </div>
                      <StatusPill
                        tone={
                          scheduleStatusTone(job.statusLabel) ??
                          severityTones[job.statusSeverity]
                        }
                      >
                        {job.statusLabel}
                      </StatusPill>
                    </Link>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm font-semibold text-theme-text-secondary">
                  No jobs scheduled for today yet. Seed the demo story or create
                  a job to populate the dispatch list.
                </p>
              )}
            </div>
          </Card>

          <DashboardMap
            liveTechCount={technicians.length}
            mapState={mapState}
            techLabelColorMap={techLabelColorMap}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Alerts &amp; blockers</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">
                  Jobs needing attention
                </h2>
              </div>
              <StatusPill
                tone={state.alerts.length > 0 ? "warning" : "success"}
              >
                {state.alerts.length > 0
                  ? `${state.alerts.length} open`
                  : "Clear"}
              </StatusPill>
            </div>
            <div className="mt-4 grid gap-3">
              {state.alerts.length > 0 ? (
                state.alerts.map((alert) => (
                  <div
                    className={`rounded-md border p-3 ${statusSurfaceClassName(
                      severityTones[alert.severity],
                    )}`}
                    key={alert.id}
                  >
                    <StatusPill tone={severityTones[alert.severity]}>
                      {alert.label}
                    </StatusPill>
                    <p className="mt-2 text-sm font-semibold text-theme-text-secondary">
                      {alert.detail}
                    </p>
                  </div>
                ))
              ) : (
                <p
                  className={`rounded-md border p-3 text-sm font-semibold text-theme-text-secondary ${statusSurfaceClassName(
                    "success",
                  )}`}
                >
                  Active route and launch checks are clear for the loaded demo
                  data.
                </p>
              )}
              {/* Only show the next-action CTA when there are open alerts to act on */}
              {state.alerts.length > 0 && (
                <Link
                  className={buttonClassName({
                    fullWidth: true,
                    size: "sm",
                    variant: "ghost",
                  })}
                  href={state.nextAction.href}
                >
                  {state.nextAction.label}
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Chemicals &amp; supplies</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">Low inventory</h2>
              </div>
              <StatusPill
                tone={lowInventory.length > 0 ? "warning" : "success"}
              >
                {lowInventory.length > 0 ? "Review" : "Stocked"}
              </StatusPill>
            </div>
            <div className="mt-4 divide-y divide-theme-border-subtle">
              {lowInventory.length > 0 ? (
                lowInventory.map((item) => (
                  <Link
                    className={`mb-3 block rounded-md border p-3 transition hover:border-theme-action-primary ${statusSurfaceClassName(
                      "warning",
                    )}`}
                    href="/inventory"
                    key={item.id ?? item.name}
                  >
                    <p className="text-sm font-bold text-primitive-navy-950">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                      {item.current_stock} {inventoryUnit(item)} on hand ·
                      reorder at {item.reorder_level}
                    </p>
                  </Link>
                ))
              ) : (
                <p
                  className={`rounded-md border p-3 text-sm font-semibold text-theme-text-secondary ${statusSurfaceClassName(
                    "success",
                  )}`}
                >
                  No loaded chemicals are below reorder level.
                </p>
              )}
            </div>
          </Card>

          {/* Technician performance */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Team</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">Technicians</h2>
                <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                  {technicians.length}{" "}
                  {technicians.length === 1 ? "technician" : "technicians"}{" "}
                  assigned
                </p>
              </div>
              <Link
                className={buttonClassName({ size: "sm", variant: "ghost" })}
                href="/technicians"
              >
                All techs
              </Link>
            </div>
            <div className="mt-4 divide-y divide-theme-border-subtle">
              {biMetrics.techPerformance.length > 0 ? (
                biMetrics.techPerformance.map((tech, i) => {
                  const avatarClass =
                    AVATAR_PALETTES[i % AVATAR_PALETTES.length];
                  const pct =
                    biMetrics.maxTechRevenue > 0
                      ? Math.round(
                          (tech.revenueCents / biMetrics.maxTechRevenue) * 100,
                        )
                      : tech.jobCount > 0
                        ? 30
                        : 0;

                  return (
                    <div
                      className="flex items-center gap-3 py-3"
                      key={tech.id}
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${avatarClass}`}
                      >
                        {techInitials(tech.label)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-bold text-primitive-navy-950">
                            {tech.label}
                          </p>
                          <p className="shrink-0 text-xs font-semibold text-theme-text-secondary">
                            {tech.jobCount}{" "}
                            {tech.jobCount === 1 ? "job" : "jobs"}
                            {tech.revenueCents > 0
                              ? ` · ${formatCurrency(tech.revenueCents)}`
                              : ""}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-theme-background-subtle">
                          <div
                            className="h-1 rounded-full bg-theme-action-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-3 text-sm font-semibold text-theme-text-secondary">
                  No technician assignments found. Seed demo data to populate
                  performance metrics.
                </p>
              )}
            </div>
          </Card>
        </section>

        <InsightBanner href={insightHref} narrative={insightNarrative} />

        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow tone="muted">Admin tools</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">
                  Launch readiness tools
                </h2>
              </div>
              <StatusPill tone="neutral">Demo tools</StatusPill>
            </div>
          </summary>
          <div className="hidden gap-4 border-t border-theme-border-subtle p-4 group-open:grid">
            <section className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
              <Card className="shadow-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <Eyebrow tone="muted">Launch gates</Eyebrow>
                    <h2 className="mt-1 text-xl font-bold">Smoke readiness</h2>
                  </div>
                  <p className="max-w-xl text-sm font-semibold text-theme-text-secondary">
                    Operator checks stay provider-free until approved env and
                    access are available.
                  </p>
                </div>
                <div className="mt-4 divide-y divide-theme-border-subtle">
                  {state.launchReadiness.map((item) => (
                    <Link
                      className={`mb-3 block rounded-md border p-3 transition hover:border-theme-action-primary ${statusSurfaceClassName(
                        severityTones[item.severity],
                      )}`}
                      href={item.href}
                      key={item.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-primitive-navy-950">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-theme-text-secondary">
                            {item.summary}
                          </p>
                        </div>
                        <StatusPill tone={severityTones[item.severity]}>
                          {item.stateLabel}
                        </StatusPill>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-theme-text-muted">
                        {item.action}
                      </p>
                      {item.command ? (
                        <p className="mt-2 rounded-md bg-primitive-slate-100 px-2 py-1 font-mono text-xs text-theme-text-secondary">
                          {item.command}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </Card>
              <DemoSeedControls />
            </section>

            <section>
              <Card className="shadow-none">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <Eyebrow tone="muted">Demo readiness</Eyebrow>
                    <h2 className="mt-1 text-xl font-bold">
                      Guided demo smoke
                    </h2>
                  </div>
                  <p className="max-w-xl text-sm font-semibold text-theme-text-secondary">
                    Route links and evidence prompts are operator aids only.
                    They do not store checklist state or require production
                    customer data.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-5">
                  {state.smokeChecklist.map((item, index) => (
                    <Link
                      className={`flex min-h-64 flex-col gap-4 rounded-md border p-4 transition hover:border-theme-action-primary hover:bg-theme-background-surface hover:shadow-sm ${statusSurfaceClassName(
                        "info",
                      )}`}
                      href={item.href}
                      key={item.id}
                    >
                      <div>
                        <p className="text-xs font-bold uppercase text-theme-text-muted">
                          Step {index + 1}
                        </p>
                        <p className="mt-2 text-sm font-bold text-primitive-navy-950">
                          {item.label}
                        </p>
                        <p className="mt-2 text-xs font-bold uppercase text-primitive-sky-500">
                          {item.routeLabel}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-col justify-end gap-3 text-sm">
                        <p className="text-theme-text-secondary">
                          {item.action}
                        </p>
                        <p className="font-semibold text-theme-text-secondary">
                          Success: {item.successSignal}
                        </p>
                        <p className="text-xs font-semibold text-theme-text-muted">
                          {item.evidencePrompt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        </details>
      </div>
    </main>
  );
}
