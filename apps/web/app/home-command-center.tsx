"use client";

import {
  buildHomeCommandCenterState,
  type HomeCommandCenterSeverity,
} from "@pest-patrol/domain";
import Link from "next/link";

import { useCustomerPortalProviderStatus } from "../hooks/useCustomerPortalAccess";
import { useCustomers } from "../hooks/useCustomers";
import { useJobs } from "../hooks/useJobs";
import { useChemicalInventory } from "../hooks/useInventory";
import { useInvoices } from "../hooks/usePayments";
import { useTechnicians } from "../hooks/useTechnicians";
import { DemoSeedControls } from "./demo-seed-controls";

const severityClasses: Record<
  HomeCommandCenterSeverity,
  { bg: string; border: string; dot: string; text: string }
> = {
  good: {
    bg: "bg-status-alert-success-bg",
    border: "border-status-alert-success-border",
    dot: "bg-status-alert-success-solid",
    text: "text-status-alert-success-fg",
  },
  neutral: {
    bg: "bg-status-alert-neutral-bg",
    border: "border-status-alert-neutral-border",
    dot: "bg-status-alert-neutral-solid",
    text: "text-status-alert-neutral-fg",
  },
  urgent: {
    bg: "bg-status-alert-danger-bg",
    border: "border-status-alert-danger-border",
    dot: "bg-status-alert-danger-solid",
    text: "text-status-alert-danger-fg",
  },
  warning: {
    bg: "bg-status-alert-warning-bg",
    border: "border-status-alert-warning-border",
    dot: "bg-status-alert-warning-solid",
    text: "text-status-alert-warning-fg",
  },
};

function serviceLabel(notes: string | null | undefined) {
  const trimmed = notes?.trim();

  return trimmed || "Service visit";
}

export function HomeCommandCenter() {
  const customersQuery = useCustomers();
  const jobsQuery = useJobs();
  const techniciansQuery = useTechnicians();
  const inventoryQuery = useChemicalInventory();
  const invoicesQuery = useInvoices();
  const portalProviderQuery = useCustomerPortalProviderStatus();

  const state = buildHomeCommandCenterState({
    customers: customersQuery.data?.map((customer) => ({
      status: customer.status,
    })),
    inventory: inventoryQuery.data?.map((item) => ({
      current_stock: item.current_stock,
      name: item.name,
      reorder_level: item.reorder_level,
    })),
    invoices: invoicesQuery.data?.map((invoice) => ({
      status: invoice.status,
      total_cents: invoice.total_cents,
    })),
    jobs: jobsQuery.data?.map((job) => ({
      customerName: job.customer?.name,
      id: job.id,
      scheduled_start: job.scheduled_start,
      serviceLabel: serviceLabel(job.service_notes),
      status: job.status,
    })),
    portalProviderStatus: portalProviderQuery.data,
    technicians: techniciansQuery.data?.map((technician) => ({
      status: technician.status,
    })),
  });

  const loading =
    customersQuery.isLoading ||
    jobsQuery.isLoading ||
    techniciansQuery.isLoading ||
    inventoryQuery.isLoading ||
    invoicesQuery.isLoading ||
    portalProviderQuery.isLoading;

  return (
    <main className="min-h-screen bg-theme-background-canvas text-theme-text-primary">
      <section className="bg-theme-background-inverse text-theme-text-inverse">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-wide text-primitive-yellow-400">
                Pest Patrol OS
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Field command center
              </h1>
              <p className="mt-3 text-sm font-bold uppercase text-primitive-sky-100">
                Live operations snapshot
              </p>
              <p className="mt-1 max-w-2xl text-sm text-primitive-sky-100 sm:text-base">
                Dispatch, demo readiness, billing, and field workflow handoff.
              </p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-96">
              <Link
                className="rounded-md bg-theme-action-primary px-4 py-3 font-bold text-theme-text-inverse transition hover:bg-theme-action-primaryStrong"
                href={state.nextAction.href}
              >
                {state.nextAction.label}
              </Link>
              <Link
                className="rounded-md border border-theme-text-inverse/20 px-4 py-3 font-bold text-theme-text-inverse transition hover:bg-theme-background-surface/10"
                href="/dispatch"
              >
                Open dispatch
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {state.kpis.map((kpi) => {
              const severity = severityClasses[kpi.severity];

              return (
                <div
                  className={`rounded-md border bg-theme-background-surface p-4 text-theme-text-primary shadow-sm ${severity.border}`}
                  key={kpi.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase text-theme-text-muted">
                      {kpi.label}
                    </p>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full ${severity.dot}`}
                    />
                  </div>
                  <p className="mt-3 text-3xl font-bold">{kpi.value}</p>
                  <p className={`mt-1 text-sm font-semibold ${severity.text}`}>
                    {kpi.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.35fr_.9fr] lg:px-8">
        <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-primitive-sky-500">
                Live dispatch
              </p>
              <h2 className="mt-1 text-xl font-bold">Today&apos;s schedule</h2>
            </div>
            <p className="rounded-md bg-primitive-yellow-400/20 px-3 py-2 text-xs font-bold text-primitive-navy-950">
              {loading ? "Refreshing live snapshot" : state.portalProviderLabel}
            </p>
          </div>

          <div className="mt-4 divide-y divide-primitive-slate-100">
            {state.schedule.length > 0 ? (
              state.schedule.map((job) => {
                const severity = severityClasses[job.statusSeverity];

                return (
                  <Link
                    className="grid gap-3 py-3 transition hover:bg-theme-background-subtle sm:grid-cols-[5rem_1fr_auto]"
                    href={job.href}
                    key={job.id}
                  >
                    <p className="text-sm font-bold">{job.timeLabel}</p>
                    <div>
                      <p className="font-bold">{job.serviceLabel}</p>
                      <p className="text-sm text-theme-text-secondary">{job.customerName}</p>
                    </div>
                    <span
                      className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${severity.bg} ${severity.text}`}
                    >
                      {job.statusLabel}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-md border border-dashed border-theme-border-default bg-theme-background-subtle p-4 text-sm text-theme-text-secondary">
                No jobs scheduled for today yet. Seed the demo story or create a
                job to populate the dispatch list.
              </div>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-primitive-sky-500">
              Command brief
            </p>
            <h2 className="mt-1 text-xl font-bold">Next best action</h2>
            <p className="mt-2 text-sm text-theme-text-secondary">
              {state.nextAction.summary}
            </p>
            <div className="mt-4 grid gap-2">
              {state.alerts.map((alert) => {
                const severity = severityClasses[alert.severity];

                return (
                  <div
                    className={`rounded-md border p-3 ${severity.bg} ${severity.border}`}
                    key={alert.id}
                  >
                    <p className={`text-sm font-bold ${severity.text}`}>
                      {alert.label}
                    </p>
                    <p className="mt-1 text-sm text-theme-text-secondary">{alert.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-primitive-red-500">
              Launch gates
            </p>
            <h2 className="mt-1 text-xl font-bold">Smoke readiness</h2>
            <div className="mt-4 divide-y divide-primitive-slate-100">
              {state.launchReadiness.map((item) => {
                const severity = severityClasses[item.severity];

                return (
                  <Link
                    className="block py-3 transition hover:bg-theme-background-subtle"
                    href={item.href}
                    key={item.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-primitive-navy-950">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-theme-text-secondary">
                          {item.summary}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${severity.bg} ${severity.text}`}
                      >
                        {item.stateLabel}
                      </span>
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
                );
              })}
            </div>
          </div>
          <DemoSeedControls />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-md border border-theme-border-subtle bg-theme-background-surface p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-primitive-red-500">
                Demo readiness
              </p>
              <h2 className="mt-1 text-xl font-bold">Guided demo smoke</h2>
            </div>
            <p className="max-w-xl text-sm text-theme-text-secondary">
              Route links and evidence prompts are operator aids only. They do
              not store checklist state or require production customer data.
            </p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-5">
            {state.smokeChecklist.map((item, index) => (
              <Link
                className="flex min-h-64 flex-col gap-4 rounded-md border border-theme-border-subtle bg-theme-background-subtle p-4 transition hover:border-primitive-sky-500 hover:bg-theme-background-surface hover:shadow-sm"
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
                  <p className="text-theme-text-secondary">{item.action}</p>
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
        </div>
      </section>
    </main>
  );
}
