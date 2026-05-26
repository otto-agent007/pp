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
  StatTile,
  StatusPill,
  buttonClassName,
  statusSurfaceClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
import type { ChemicalInventoryItem, Invoice, Job } from "@pest-patrol/types";
import Link from "next/link";
import { useState } from "react";

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

const severityTones: Record<HomeCommandCenterSeverity, StatusPillTone> = {
  good: "success",
  neutral: "neutral",
  urgent: "danger",
  warning: "warning",
};

const openInvoiceStatuses = new Set(["draft", "sent"]);

function serviceLabel(notes: string | null | undefined) {
  const trimmed = notes?.trim();

  return trimmed || "Service visit";
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

function DashboardMetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: StatusPillTone;
  value: string;
}) {
  return (
    <StatTile detail={detail} label={label} tone={tone} value={value} />
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
        <p className="px-2 py-2">
          {mapState.summary.missing_coordinates_count} missing GPS
        </p>
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

function buildRecentActivity(
  jobs: Job[],
  invoices: Invoice[],
  inventory: ChemicalInventoryItem[],
) {
  const completedJobs = jobs
    .filter((job) => job.status === "completed")
    .map((job) => ({
      href: `/jobs/${job.id}`,
      label: `${job.customer?.name ?? "Customer"} completed ${serviceLabel(
        job.service_notes,
      )}`,
      meta: "Field workflow",
    }));
  const invoiceItems = invoices.slice(0, 2).map((invoice) => ({
    href: "/payments",
    label: `${formatCurrency(invoice.total_cents)} invoice ${invoice.status}`,
    meta: "Billing",
  }));
  const lowStockItems = inventory
    .filter(
      (item) =>
        item.reorder_level !== null &&
        item.reorder_level !== undefined &&
        item.current_stock <= item.reorder_level,
    )
    .map((item) => ({
      href: "/inventory",
      label: `${item.name} is below reorder level`,
      meta: "Inventory",
    }));

  return [...completedJobs, ...invoiceItems, ...lowStockItems].slice(0, 5);
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
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const techniciansQuery = useTechnicians();
  const inventoryQuery = useChemicalInventory();
  const invoicesQuery = useInvoices();
  const portalProviderQuery = useCustomerPortalProviderStatus();
  const geofenceEventsQuery = useJobGeofenceEvents();

  const now = new Date();
  const today = dateKey(now);
  const jobs = jobsQuery.data ?? [];
  const technicians = techniciansQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
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
  const recentActivity = buildRecentActivity(jobs, invoices, inventory);
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
            <label className="block">
              <span className="sr-only">Search overview</span>
              <input
                className="min-h-10 w-full rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-semibold outline-none transition placeholder:text-theme-text-muted focus:border-theme-action-primary focus:ring-2 focus:ring-theme-action-primary/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers, jobs, addresses..."
                type="search"
                value={search}
              />
            </label>
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
            <StatusPill tone={loading ? "neutral" : "info"}>
              {loading ? "Refreshing" : state.portalProviderLabel}
            </StatusPill>
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
          {state.kpis.map((kpi) => (
            <DashboardMetricCard
              detail={kpi.detail}
              key={kpi.id}
              label={kpi.label}
              tone={severityTones[kpi.severity]}
              value={kpi.value}
            />
          ))}
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
                <Eyebrow tone="accent">Work queue</Eyebrow>
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
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Low inventory</Eyebrow>
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

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow tone="accent">Recent activity</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">Recent activity</h2>
              </div>
              <StatusPill tone={openInvoices.length > 0 ? "danger" : "success"}>
                {openInvoices.length} unpaid
              </StatusPill>
            </div>
            <div className="mt-4 divide-y divide-theme-border-subtle">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <Link
                    className="block py-3 transition hover:bg-theme-background-subtle"
                    href={item.href}
                    key={`${item.href}-${item.label}`}
                  >
                    <p className="text-sm font-bold text-primitive-navy-950">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-theme-text-muted">
                      {item.meta}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-theme-border-subtle bg-theme-background-subtle p-3 text-sm font-semibold text-theme-text-secondary">
                  Activity appears after demo jobs, invoices, or inventory
                  changes load.
                </p>
              )}
            </div>
          </Card>
        </section>

        <details className="group rounded-lg border border-theme-border-subtle bg-theme-background-surface shadow-sm">
          <summary className="cursor-pointer px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-theme-action-primary focus-visible:ring-offset-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow tone="muted">Admin tools</Eyebrow>
                <h2 className="mt-1 text-lg font-bold">
                  Launch readiness tools
                </h2>
              </div>
              <StatusPill tone="neutral">Provider-free checks</StatusPill>
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
